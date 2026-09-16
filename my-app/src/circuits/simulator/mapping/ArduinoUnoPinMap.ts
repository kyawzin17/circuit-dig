export type ArduinoUnoPinMapping = {
  arduinoPin: string;

  port:
    | "B"
    | "C"
    | "D";

  bit: number;
};

export const ARDUINO_UNO_PIN_MAP: Record<
  string,
  ArduinoUnoPinMapping
> = {
  D0: {
    arduinoPin: "D0",
    port: "D",
    bit: 0,
  },

  D1: {
    arduinoPin: "D1",
    port: "D",
    bit: 1,
  },

  D2: {
    arduinoPin: "D2",
    port: "D",
    bit: 2,
  },

  D3: {
    arduinoPin: "D3",
    port: "D",
    bit: 3,
  },

  D4: {
    arduinoPin: "D4",
    port: "D",
    bit: 4,
  },

  D5: {
    arduinoPin: "D5",
    port: "D",
    bit: 5,
  },

  D6: {
    arduinoPin: "D6",
    port: "D",
    bit: 6,
  },

  D7: {
    arduinoPin: "D7",
    port: "D",
    bit: 7,
  },

  D8: {
    arduinoPin: "D8",
    port: "B",
    bit: 0,
  },

  D9: {
    arduinoPin: "D9",
    port: "B",
    bit: 1,
  },

  D10: {
    arduinoPin: "D10",
    port: "B",
    bit: 2,
  },

  D11: {
    arduinoPin: "D11",
    port: "B",
    bit: 3,
  },

  D12: {
    arduinoPin: "D12",
    port: "B",
    bit: 4,
  },

  D13: {
    arduinoPin: "D13",
    port: "B",
    bit: 5,
  },

  A0: {
    arduinoPin: "A0",
    port: "C",
    bit: 0,
  },

  A1: {
    arduinoPin: "A1",
    port: "C",
    bit: 1,
  },

  A2: {
    arduinoPin: "A2",
    port: "C",
    bit: 2,
  },

  A3: {
    arduinoPin: "A3",
    port: "C",
    bit: 3,
  },

  A4: {
    arduinoPin: "A4",
    port: "C",
    bit: 4,
  },

  A5: {
    arduinoPin: "A5",
    port: "C",
    bit: 5,
  },
};

// =====================================================
// ARDUINO UNO PIN MAP
// =====================================================

// export const ARDUINO_UNO_PIN_MAP = {
//   D0: 0,
//   D1: 1,
//   D2: 2,
//   D3: 3,
//   D4: 4,
//   D5: 5,
//   D6: 6,
//   D7: 7,
//   D8: 8,
//   D9: 9,
//   D10: 10,
//   D11: 11,
//   D12: 12,
//   D13: 13,

//   A0: 14,
//   A1: 15,
//   A2: 16,
//   A3: 17,
//   A4: 18,
//   A5: 19,
// } as const;

export type ArduinoUnoPinName =
  keyof typeof ARDUINO_UNO_PIN_MAP;