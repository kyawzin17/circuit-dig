import type { CircuitPin } from "../types/pin.types";

// =====================================================
// ARDUINO PRO MINI PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// CircuitPin.id is the canonical pin ID.
//
// React Flow Handle IDs must be exactly the same.
//
// Arduino Pro Mini consists of Digital I/O, Analog Input,
// Power (RAW/VCC/GND), and Serial Communication (RX/TX) pins.
//
// =====================================================

export const arduinoProMiniPins: CircuitPin[] = [
  // =====================================================
  // SERIAL COMMUNICATION & CONTROL
  // =====================================================

  {
    id: "tx",
    label: "TXO",
    alias: "Transmit (D1)",
    type: "terminal",
    direction: "passive",
    description:
      "Serial data transmit pin (Digital Pin 1). Used for UART serial communication.",
  },
  {
    id: "rx",
    label: "RXI",
    alias: "Receive (D0)",
    type: "terminal",
    direction: "passive",
    description:
      "Serial data receive pin (Digital Pin 0). Used for UART serial communication.",
  },
  {
    id: "rst",
    label: "RST",
    alias: "Reset",
    type: "terminal",
    direction: "passive",
    description:
      "Reset line. Bringing this pin LOW resets the microcontroller.",
  },

  // =====================================================
  // POWER PINS
  // =====================================================

  {
    id: "gnd",
    label: "GND",
    alias: "Ground (0V)",
    type: "terminal",
    direction: "passive",
    description:
      "Ground reference pin (0V) for the microcontroller circuit.",
  },
  {
    id: "vcc",
    label: "VCC",
    alias: "Regulated Power",
    type: "terminal",
    direction: "passive",
    description:
      "Regulated voltage input/output pin (+5V or +3.3V depending on board model).",
  },
  {
    id: "raw",
    label: "RAW",
    alias: "Unregulated Power Input",
    type: "terminal",
    direction: "passive",
    description:
      "Unregulated power supply input (typically 5V - 12V DC). Regulated on-board by the internal voltage regulator.",
  },

  // =====================================================
  // DIGITAL I/O PINS (D2 - D13)
  // =====================================================

  {
    id: "d2",
    label: "D2",
    alias: "Digital Pin 2 / INT0",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 2. Supports external interrupt 0.",
  },
  {
    id: "d3",
    label: "D3",
    alias: "Digital Pin 3 (PWM) / INT1",
    type: "terminal",
    direction: "passive",
    description: "Digital I/O pin 3. Supports PWM output and external interrupt 1.",
  },
  {
    id: "d4",
    label: "D4",
    alias: "Digital Pin 4",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 4.",
  },
  {
    id: "d5",
    label: "D5",
    alias: "Digital Pin 5 (PWM)",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 5. Supports PWM output.",
  },
  {
    id: "d6",
    label: "D6",
    alias: "Digital Pin 6 (PWM)",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 6. Supports PWM output.",
  },
  {
    id: "d7",
    label: "D7",
    alias: "Digital Pin 7",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 7.",
  },
  {
    id: "d8",
    label: "D8",
    alias: "Digital Pin 8",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 8.",
  },
  {
    id: "d9",
    label: "D9",
    alias: "Digital Pin 9 (PWM)",
    type: "terminal",
    direction: "passive",
    description: "Digital Input/Output pin 9. Supports PWM output.",
  },
  {
    id: "d10",
    label: "D10",
    alias: "Digital Pin 10 (PWM / SS)",
    type: "terminal",
    direction: "passive",
    description: "Digital I/O pin 10. Supports PWM output and SPI Slave Select.",
  },
  {
    id: "d11",
    label: "D11",
    alias: "Digital Pin 11 (PWM / MOSI)",
    type: "terminal",
    direction: "passive",
    description: "Digital I/O pin 11. Supports PWM output and SPI MOSI.",
  },
  {
    id: "d12",
    label: "D12",
    alias: "Digital Pin 12 (MISO)",
    type: "terminal",
    direction: "passive",
    description: "Digital I/O pin 12. Supports SPI MISO.",
  },
  {
    id: "d13",
    label: "D13",
    alias: "Digital Pin 13 (SCK / Onboard LED)",
    type: "terminal",
    direction: "passive",
    description: "Digital I/O pin 13. Supports SPI Serial Clock and connects to onboard LED.",
  },

  // =====================================================
  // ANALOG INPUT PINS (A0 - A7)
  // =====================================================

  {
    id: "a0",
    label: "A0",
    alias: "Analog Input 0",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 0 (10-bit ADC). Can also be used as Digital I/O.",
  },
  {
    id: "a1",
    label: "A1",
    alias: "Analog Input 1",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 1 (10-bit ADC). Can also be used as Digital I/O.",
  },
  {
    id: "a2",
    label: "A2",
    alias: "Analog Input 2",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 2 (10-bit ADC). Can also be used as Digital I/O.",
  },
  {
    id: "a3",
    label: "A3",
    alias: "Analog Input 3",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 3 (10-bit ADC). Can also be used as Digital I/O.",
  },
  {
    id: "a4",
    label: "A4",
    alias: "Analog Input 4 / SDA",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 4. Also serves as I2C SDA (Serial Data) pin.",
  },
  {
    id: "a5",
    label: "A5",
    alias: "Analog Input 5 / SCL",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 5. Also serves as I2C SCL (Serial Clock) pin.",
  },
  {
    id: "a6",
    label: "A6",
    alias: "Analog Input 6",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 6 (Analog input ONLY).",
  },
  {
    id: "a7",
    label: "A7",
    alias: "Analog Input 7",
    type: "terminal",
    direction: "passive",
    description: "Analog input channel 7 (Analog input ONLY).",
  },
];

// =====================================================
// PIN LOOKUP
// =====================================================

export const arduinoProMiniPinsById = Object.fromEntries(
  arduinoProMiniPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;