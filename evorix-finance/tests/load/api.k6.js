// One virtual user is one person navigating: a page view, then 3 to 7 seconds
// reading. Members open their account pages; visitors the public ones.
import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Rate } from "k6/metrics";

const tokens = JSON.parse(open(__ENV.SESSIONS_FILE));
const bases = (__ENV.BASE_URLS || "http://127.0.0.1:4181").split(",");
const memberShare = Number(__ENV.MEMBER_SHARE || 0.7);
const unexpected = new Rate("unexpected_status");

export const options = {
  scenarios: {
    users: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 50),
      duration: __ENV.DURATION || "40s",
      gracefulStop: "10s",
    },
  },
  discardResponseBodies: true,
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function expect(response, statuses) {
  const ok = statuses.includes(response.status);
  unexpected.add(!ok, { status: String(response.status) });
  check(response, { [`status ${statuses.join("/")}`]: () => ok });
}

export default function () {
  const vu = exec.vu.idInTest;
  const base = bases[vu % bases.length];
  // Each person has their own address, as behind real networks.
  const headers = {
    "X-Forwarded-For": `10.${(vu >> 16) & 255}.${(vu >> 8) & 255}.${vu & 255}`,
  };
  if (vu % 100 < memberShare * 100) {
    headers.Cookie = `evorix_session=${tokens[vu % tokens.length]}`;
    expect(
      http.get(`${base}/api/auth/me`, { headers, tags: { name: "me" } }),
      [200],
    );
    const [ranking, notifications, learning] = http.batch([
      [
        "GET",
        `${base}/api/rankings`,
        null,
        { headers, tags: { name: "rankings" } },
      ],
      [
        "GET",
        `${base}/api/notifications`,
        null,
        { headers, tags: { name: "notifications" } },
      ],
      [
        "GET",
        `${base}/api/learning`,
        null,
        { headers, tags: { name: "learning" } },
      ],
    ]);
    expect(ranking, [200]);
    expect(notifications, [200]);
    expect(learning, [200]);
  } else {
    expect(
      http.get(`${base}/api/auth/me`, { headers, tags: { name: "me" } }),
      [401],
    );
    expect(
      http.get(`${base}/api/learning`, { headers, tags: { name: "learning" } }),
      [200],
    );
  }
  sleep(3 + Math.random() * 4);
}
