const UNIT_TO_MS = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
} as const;

type DurationUnit = keyof typeof UNIT_TO_MS;

export function durationToMs(value: string): number {
  const match = value.trim().match(/^(\d+)\s*([smhd])$/);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);

  const unit = match[2] as DurationUnit;

  return amount * UNIT_TO_MS[unit];
}
