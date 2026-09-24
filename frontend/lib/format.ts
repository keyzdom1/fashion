export function formatNaira(amount: string | number): string {
  const n = Number(amount) || 0;
  return `₦${n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
