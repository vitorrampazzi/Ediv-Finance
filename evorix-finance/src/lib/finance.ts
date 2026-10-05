const scale = 100_000_000n;
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
export function units(value: string) {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const absolute =
    BigInt(whole || "0") * scale + BigInt(fraction.padEnd(8, "0").slice(0, 8));
  return negative ? -absolute : absolute;
}
export function decimal(value: bigint) {
  const absolute = value < 0n ? -value : value;
  return (
    (value < 0n ? "-" : "") +
    String(absolute / scale) +
    "." +
    String(absolute % scale).padStart(8, "0")
  );
}
export function formatMoney(value: string) {
  const number = units(value);
  const absolute = number < 0n ? -number : number;
  const cents = (absolute + 500_000n) / 1_000_000n;
  return (
    "R$ " +
    (number < 0n ? "-" : "") +
    integer.format(cents / 100n) +
    "," +
    String(cents % 100n).padStart(2, "0")
  );
}
export function sumMoney(values: string[]) {
  return decimal(values.reduce((sum, value) => sum + units(value), 0n));
}
export const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};
