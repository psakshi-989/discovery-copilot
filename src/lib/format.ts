export const money = (n: number, symbol: string): string =>
  `${symbol}${Math.round(n).toLocaleString("en-IN")}`;

export const plain = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const monthsText = (n: number | null): string => (n === null ? "n/a" : plain(n));

export const percent = (n: number): string => `${Math.round(n * 100)}%`;
