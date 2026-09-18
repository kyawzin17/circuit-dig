export function intelHexToProgram(hex: string): Uint16Array {
  const bytes = new Map<number, number>();
  let upperAddress = 0;
  for (const raw of hex.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.startsWith(":")) throw new Error("Invalid Intel HEX record.");
    const text = line.slice(1);
    if (text.length < 10 || text.length % 2 !== 0) throw new Error("Malformed Intel HEX record.");
    const values: number[] = [];
    for (let i = 0; i < text.length; i += 2) values.push(parseInt(text.slice(i, i + 2), 16));
    if (values.some(Number.isNaN)) throw new Error("Invalid Intel HEX byte.");
    const count = values[0];
    const address = (values[1] << 8) | values[2];
    const type = values[3];
    const data = values.slice(4, 4 + count);
    if (values.slice(0, 4 + count + 1).reduce((a, b) => (a + b) & 0xff, 0) !== 0) {
      throw new Error("Intel HEX checksum mismatch.");
    }
    if (type === 0x00) {
      const base = upperAddress + address;
      data.forEach((value, index) => bytes.set(base + index, value));
    } else if (type === 0x01) break;
    else if (type === 0x02 && data.length === 2) upperAddress = ((data[0] << 8) | data[1]) << 4;
    else if (type === 0x04 && data.length === 2) upperAddress = ((data[0] << 8) | data[1]) << 16;
  }
  if (bytes.size === 0) return new Uint16Array(0);
  const max = Math.max(...bytes.keys());
  const program = new Uint16Array(Math.ceil((max + 1) / 2));
  for (const [address, value] of bytes) {
    const word = Math.floor(address / 2);
    if ((address & 1) === 0) program[word] = value;
    else program[word] |= value << 8;
  }
  return program;
}
