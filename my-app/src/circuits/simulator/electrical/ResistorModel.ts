/**
 * Parse common resistor-value labels into ohms.
 *
 * Supported examples: 220, "220Ω", "4.7kΩ", "4k7", "2M2", "1m",
 * and scientific notation such as "1e3". SI prefix case is preserved:
 * m = milli, M = mega.
 *
 * Invalid, zero, negative, and non-finite values return undefined. The
 * electrical solver treats those values as an open component and reports
 * a diagnostic instead of silently substituting a different resistance.
 */
export function parseResistanceOhms(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .trim()
    .replace(/\\s+/g, "")
    .replace(/Ω/gi, "")
    .replace(/ohms?/gi, "");

  if (!normalized) return undefined;

  // SPICE-style decimal notation: 4k7 = 4.7kΩ, 2M2 = 2.2MΩ.
  const engineering = normalized.match(/^([0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)([RrKkMmGgTt])([0-9]+)$/);
  if (engineering) {
    const base = Number(engineering[1] + "." + engineering[3]);
    const multiplier = prefixMultiplier(engineering[2]);
    const result = base * multiplier;
    return Number.isFinite(result) && result > 0 ? result : undefined;
  }

  const suffixed = normalized.match(/^([0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)([RrKkMmGgTt]?)$/);
  if (suffixed) {
    const base = Number(suffixed[1]);
    const result = base * (suffixed[2] ? prefixMultiplier(suffixed[2]) : 1);
    return Number.isFinite(result) && result > 0 ? result : undefined;
  }

  // Preserve support for valid numeric strings such as "1e3".
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function prefixMultiplier(prefix: string): number {
  switch (prefix) {
    case "R":
    case "r":
      return 1;
    case "k":
    case "K":
      return 1_000;
    case "m":
      return 0.001;
    case "M":
      return 1_000_000;
    case "g":
    case "G":
      return 1_000_000_000;
    case "t":
    case "T":
      return 1_000_000_000_000;
    default:
      return 1;
  }
}
