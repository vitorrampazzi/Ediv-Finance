#!/usr/bin/env bash
# Usage: run.sh <label> <app dir> <database delay in ms>
# Starts the API as several Vercel-like instances, delays the traffic to the
# disposable MySQL and runs k6 once per concurrency level in LEVELS.
set -euo pipefail
label=$1
app=$(cd "$2" && pwd)
delay=$3
here=$(cd "$(dirname "$0")" && pwd)
out="$here/out"
mkdir -p "$out"
mysql_id=$(docker ps --filter "ancestor=mysql:8.4" --quiet | head -1)

for dev in $(ls /sys/class/net | grep -E '^(docker0|br-)'); do
  sudo tc qdisc del dev "$dev" root 2>/dev/null || true
  if [ "$delay" -gt 0 ]; then
    sudo tc qdisc add dev "$dev" root netem delay "${delay}ms"
  fi
done
docker exec "$mysql_id" mysql -uroot -p"$MYSQL_PASSWORD" \
  -e "TRUNCATE $MYSQL_DATABASE.request_limits" 2>/dev/null

pids=()
bases=()
for i in $(seq 1 "${INSTANCES:-6}"); do
  port=$((4180 + i))
  (cd "$app" && PORT=$port exec node server/index.js) >"$out/$label-api-$i.log" 2>&1 &
  pids+=($!)
  bases+=("http://127.0.0.1:$port")
done
trap 'kill "${pids[@]}" 2>/dev/null || true; wait "${pids[@]}" 2>/dev/null || true' EXIT
for base in "${bases[@]}"; do
  for _ in $(seq 1 60); do
    curl --silent --fail "$base/api/health" >/dev/null && break
    sleep 1
  done
done

# Database round trip as the API sees it (median of 20 SELECT 1).
(cd "$app" && node --input-type=module -e '
  const { createConnection } = await import("mysql2/promise");
  const db = await createConnection({ host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
  const times = [];
  for (let i = 0; i < 20; i++) { const t = performance.now(); await db.query("SELECT 1"); times.push(performance.now() - t); }
  times.sort((a, b) => a - b);
  console.log(times[10].toFixed(1));
  await db.end();
') >"$out/$label-rtt.txt"

k6() {
  docker run --rm --network host -v "$here:/load" \
    -e VUS="$1" -e DURATION="$2" -e SESSIONS_FILE=/load/out/sessions.json \
    -e BASE_URLS="$(IFS=,; echo "${bases[*]}")" \
    grafana/k6:1.0.0 run --quiet "${@:3}" /load/api.k6.js
}
# Warm the buffer pool and the JIT; this run is not reported.
k6 20 15s >/dev/null 2>&1 || true

for vus in ${LEVELS//,/ }; do
  cpu="$out/$label-$vus-cpu.txt"
  : >"$cpu"
  (while true; do docker stats --no-stream --format '{{.CPUPerc}}' "$mysql_id" >>"$cpu"; done) &
  sampler=$!
  k6 "$vus" "${DURATION:-40s}" --summary-export "/load/out/$label-$vus.json" \
    >"$out/$label-$vus-k6.txt" 2>&1 || true
  kill "$sampler" 2>/dev/null || true
done
