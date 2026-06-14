const UNITS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDurationToMs(value: string): number {
  const match = value.trim().match(/^(\d+)([smhd])$/i);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  return parseInt(match[1], 10) * UNITS[match[2].toLowerCase()];
}
