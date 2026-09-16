export function loadIntelHex(
  source: string,
  target: Uint8Array
): void {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.startsWith(":")) {
      continue;
    }

    const byteCount = parseInt(
      line.substring(1, 3),
      16
    );

    const address = parseInt(
      line.substring(3, 7),
      16
    );

    const recordType = parseInt(
      line.substring(7, 9),
      16
    );

    // Data record
    if (recordType !== 0) {
      continue;
    }

    for (
      let i = 0;
      i < byteCount;
      i++
    ) {
      const byteValue = parseInt(
        line.substring(
          9 + i * 2,
          11 + i * 2
        ),
        16
      );

      target[address + i] = byteValue;
    }
  }
}