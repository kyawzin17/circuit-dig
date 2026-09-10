import type { CircuitPin } from "../types/pin.types";

// =====================================================
// ARDUINO UNO PIN DEFINITIONS
// =====================================================
//
// IMPORTANT
//
// pin.id is the canonical pin ID.
//
// React Flow Handle IDs must use the same value:
//
// CircuitPin.id === Handle.id
//
// Example:
//
// D13 → D13
// A0  → A0
// GND1 → GND1
//
// =====================================================

export const arduinoUnoPins: CircuitPin[] = [
  
  // { name: 'A5.2', x: 87, y: 9, dir: "top", signals: [analog(5), i2c('SCL')] },
  //     { name: 'A4.2', x: 97, y: 9, dir: "top", signals: [analog(4), i2c('SDA')] },
  //     { name: 'AREF', x: 106, y: 9, dir: "top", signals: [] },
  //     { name: 'GND.1', x: 115.5, y: 9, dir: "top", signals: [{ type: 'power', signal: 'GND' }] },
  //     { name: 'D13', x: 125, y: 9, dir: "top", signals: [spi('SCK')] },
  //     { name: 'D12', x: 134.5, y: 9, dir: "top", signals: [spi('MISO')] },
  //     { name: 'D11', x: 144, y: 9, dir: "top", signals: [spi('MOSI'), { type: 'pwm' }] },
  //     { name: 'D10', x: 153.5, y: 9, dir: "top", signals: [spi('SS'), { type: 'pwm' }] },
  //     { name: 'D9', x: 163, y: 9, dir: "top", signals: [{ type: 'pwm' }] },
  //     { name: 'D8', x: 173, y: 9, dir: "top", signals: [] },
  //     { name: 'D7', x: 189, y: 9, dir: "top", signals: [] },
  //     { name: 'D6', x: 198.5, y: 9, dir: "top", signals: [{ type: 'pwm' }] },
  //     { name: 'D5', x: 208, y: 9, dir: "top", signals: [{ type: 'pwm' }] },
  //     { name: 'D4', x: 217.5, y: 9, dir: "top", signals: [] },
  //     { name: 'D3', x: 227, y: 9, dir: "top", signals: [{ type: 'pwm' }] },
  //     { name: 'D2', x: 236.5, y: 9, dir: "top", signals: [] },
  //     { name: 'D1', x: 246, y: 9, dir: "top", signals: [usart('TX')] },
  //     { name: 'D0', x: 255.5, y: 9, dir: "top", signals: [usart('RX')] },
  //     { name: 'IOREF', x: 131, y: 191.5, dir: "bottom",signals: [] },
  //     { name: 'RESET', x: 140.5, y: 191.5, dir: "bottom", signals: [] },
  //     { name: '3.3V', x: 150, y: 191.5, dir: "bottom", signals: [{ type: 'power', signal: 'VCC', voltage: 3.3 }] },
  //     { name: '5V', x: 160, y: 191.5, dir: "bottom", signals: [{ type: 'power', signal: 'VCC', voltage: 5 }] },
  //     { name: 'GND.2', x: 169.5, y: 191.5, dir: "bottom", signals: [{ type: 'power', signal: 'GND' }] },
  //     { name: 'GND.3', x: 179, y: 191.5, dir: "bottom", signals: [{ type: 'power', signal: 'GND' }] },
  //     { name: 'VIN', x: 188.5, y: 191.5, dir: "bottom", signals: [{ type: 'power', signal: 'VCC' }] },
  //     { name: 'A0', x: 208, y: 191.5, dir: "bottom", signals: [analog(0)] },
  //     { name: 'A1', x: 217.5, y: 191.5, dir: "bottom", signals: [analog(1)] },
  //     { name: 'A2', x: 227, y: 191.5, dir: "bottom", signals: [analog(2)] },
  //     { name: 'A3', x: 236.5, y: 191.5, dir: "bottom", signals: [analog(3)] },
  //     { name: 'A4', x: 246, y: 191.5, dir: "bottom", signals: [analog(4), i2c('SDA')] },
  //     { name: 'A5', x: 255.5, y: 191.5, dir: "bottom", signals: [analog(5), i2c('SCL')] },

      {
        id: "A5.2",
        label: "A5.2",
        type: "digital",
        direction: "input",
        description:
          "Analog 5.2 pin voltage input.",
      },
      { 
        id: "A4.2",
        label: "A4.2",
        type: "digital",
        direction: "input",
        description:
          "Analog 4.2 pin voltage input.",
      },
      { 
        id: "AREF",
        label: "AREF",
        type: "digital",
        direction: "input",
        description:
          "Analog reference voltage input.",
      },
  // =====================================================
  // DIGITAL PINS
  // =====================================================
  {
    id: "D13",
    label: "D13",
    alias: "SCK / LED",
    type: "digital",
    direction: "bidirectional",
    protocols: ["spi"],
    features: ["built-in-led"],
    description:
      "SPI clock pin connected to the Arduino built-in LED.",
  },
  {
    id: "D12",
    label: "D12",
    alias: "MISO",
    type: "digital",
    direction: "bidirectional",
    protocols: ["spi"],
    description:
      "Digital pin used as SPI Master In Slave Out.",
  },
  {
    id: "D11",
    label: "D11",
    alias: "PWM / MOSI",
    type: "digital",
    direction: "bidirectional",
    protocols: ["spi"],
    features: ["pwm"],
    description:
      "Digital pin with PWM support and SPI MOSI functionality.",
  },
  {
    id: "D10",
    label: "D10",
    alias: "PWM / SS",
    type: "digital",
    direction: "bidirectional",
    protocols: ["spi"],
    features: ["pwm"],
    description:
      "Digital pin with PWM support. Can also be used as SPI Slave Select.",
  },

  {
    id: "D9",
    label: "D9",
    alias: "PWM",
    type: "digital",
    direction: "bidirectional",
    features: ["pwm"],
    description:
      "Digital input/output pin with PWM support.",
  },
  {
    id: "D8",
    label: "D8",
    type: "digital",
    direction: "bidirectional",
    description:
      "General purpose digital input/output pin.",
  },
  {
    id: "D7",
    label: "D7",
    type: "digital",
    direction: "bidirectional",
    description:
      "General purpose digital input/output pin.",
  },
  {
    id: "D6",
    label: "D6",
    alias: "PWM",
    type: "digital",
    direction: "bidirectional",
    features: ["pwm"],
    description:
      "Digital input/output pin with PWM support.",
  },
  {
    id: "D5",
    label: "D5",
    alias: "PWM",
    type: "digital",
    direction: "bidirectional",
    features: ["pwm"],
    description:
      "Digital input/output pin with PWM support.",
  },
  {
    id: "D4",
    label: "D4",
    type: "digital",
    direction: "bidirectional",
    description:
      "General purpose digital input/output pin.",
  },

  {
    id: "D3",
    label: "D3",
    alias: "PWM",
    type: "digital",
    direction: "bidirectional",
    features: ["pwm", "interrupt"],
    description:
      "Digital input/output pin with PWM and external interrupt support.",
  },
  {
    id: "D2",
    label: "D2",
    type: "digital",
    direction: "bidirectional",
    features: ["interrupt"],
    description:
      "Digital input/output pin with external interrupt support.",
  },
  {
    id: "D1",
    label: "D1",
    alias: "TX",
    type: "digital",
    direction: "bidirectional",
    protocols: ["uart"],
    description:
      "UART transmit pin. Connected to the onboard USB serial interface.",
  },
  {
      id: "D0",
      label: "D0",
      alias: "RX",
      type: "digital",
      direction: "bidirectional",
      protocols: ["uart"],
      description:
        "UART receive pin. Connected to the onboard USB serial interface.",
    },


  // =====================================================
  // ANALOG PINS
  // =====================================================

  {
    id: "A0",
    label: "A0",
    type: "analog",
    direction: "input",
    features: ["adc"],
    description:
      "Analog input channel 0. Can also be used as a digital pin.",
  },

  {
    id: "A1",
    label: "A1",
    type: "analog",
    direction: "input",
    features: ["adc"],
    description:
      "Analog input channel 1. Can also be used as a digital pin.",
  },

  {
    id: "A2",
    label: "A2",
    type: "analog",
    direction: "input",
    features: ["adc"],
    description:
      "Analog input channel 2. Can also be used as a digital pin.",
  },

  {
    id: "A3",
    label: "A3",
    type: "analog",
    direction: "input",
    features: ["adc"],
    description:
      "Analog input channel 3. Can also be used as a digital pin.",
  },

  {
    id: "A4",
    label: "A4",
    alias: "SDA",
    type: "analog",
    direction: "bidirectional",
    protocols: ["i2c"],
    features: ["adc"],
    description:
      "Analog input channel 4 and I2C SDA data line.",
  },

  {
    id: "A5",
    label: "A5",
    alias: "SCL",
    type: "analog",
    direction: "bidirectional",
    protocols: ["i2c"],
    features: ["adc"],
    description:
      "Analog input channel 5 and I2C SCL clock line.",
  },

  // =====================================================
  // POWER PINS
  // =====================================================

  {
    id: "VIN",
    label: "VIN",
    type: "power",
    direction: "input",
    voltage: {
      min: 7,
      max: 12,
      nominal: 9,
      unit: "V",
    },
    description:
      "External power input pin.",
  },

  {
    id: "5V",
    label: "5V",
    type: "power",
    direction: "output",
    voltage: {
      nominal: 5,
      unit: "V",
    },
    description:
      "Regulated 5V power output.",
  },

  {
    id: "3.3V",
    label: "3.3V",
    type: "power",
    direction: "output",
    voltage: {
      nominal: 3.3,
      unit: "V",
    },
    description:
      "Regulated 3.3V power output.",
  },

  {
    id: "IOREF",
    label: "IOREF",
    type: "power",
    direction: "output",
    voltage: {
      nominal: 5,
      unit: "V",
    },
    description:
      "Reference voltage used by the board.",
  },

  // =====================================================
  // GROUND
  // =====================================================

  {
    id: "GND1",
    label: "GND",
    alias: "Ground 1",
    type: "ground",
    direction: "passive",
    description:
      "Ground reference pin.",
  },

  {
    id: "GND2",
    label: "GND",
    alias: "Ground 2",
    type: "ground",
    direction: "passive",
    description:
      "Additional ground reference pin.",
  },

  {
    id: "GND3",
    label: "GND",
    alias: "Ground 3",
    type: "ground",
    direction: "passive",
    description:
      "Additional ground reference pin.",
  },


];

// =====================================================
// PIN LOOKUP
// =====================================================

export const arduinoUnoPinsById = Object.fromEntries(
  arduinoUnoPins.map((pin) => [
    pin.id,
    pin,
  ])
) as Record<string, CircuitPin>;