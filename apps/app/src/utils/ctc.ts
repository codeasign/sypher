export function formatCtc(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `${value.toFixed(2)} lacs per annum`;
}
