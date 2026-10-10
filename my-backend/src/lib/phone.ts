// Bangladesh mobile numbers: +880 1X XXXXXXXX, where X after the 1 is 3-9 (013 ... 019).
// Accepts the ways people type them (01712345678, 1712345678, +8801712345678, 8801712345678,
// with spaces or dashes) and returns the canonical +8801712345678, or null if it isn't one.
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  const match = /^(?:\+?880|0)?(1[3-9]\d{8})$/.exec(digits);
  return match ? `+880${match[1]}` : null;
}

export const maskPhone = (phone: string) => `${phone.slice(0, 7)}•••${phone.slice(-3)}`;
