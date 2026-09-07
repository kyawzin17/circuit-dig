import type { CircuitPin } from "../types/pin.types";

export const arduinoUnoPins: CircuitPin[] = [
  // =====================================================
  // DIGITAL PINS
  // =====================================================

  {
    id: "D0",
    label: "D0",
    alias: "RX",
    type: "digital",
    protocols: ["uart"],
    description:
      "UART receive pin. Connected to the onboard USB serial interface.",
  },

  {
    id: "D1",
    label: "D1",
    alias: "TX",
    type: "digital",
    protocols: ["uart"],
    description:
      "UART transmit pin. Connected to the onboard USB serial interface.",
  },

  {
    id: "D2",
    label: "D2",
    type: "digital",
    features: ["interrupt"],
    description:
      "Digital input/output pin with external interrupt support.",
  },

  {
    id: "D3",
    label: "D3",
    alias: "PWM",
    type: "digital",
    features: ["pwm", "interrupt"],
    description:
      "Digital input/output pin with PWM and external interrupt support.",
  },

  {
    id: "D4",
    label: "D4",
    type: "digital",
    description:
      "General purpose digital input/output pin.",
  },

  {
    id: "D5",
    label: "D5",
    alias: "PWM",
    type: "digital",
    features: ["pwm"],
    description:
      "Digital input/output pin with PWM support.",
  },

  {
    id: "D6",
    label: "D6",
    alias: "PWM",
    type: "digital",
    features: ["pwm"],
    description:
      "Digital input/output pin with PWM support.",
  },

  {
    id: "D7",
    label: "D7",
    type: "digital",
    description:
      "General purpose digital input/output pin.",
  },

  {
    id: "D8",
    label: "D8",
    type: "digital",
    description:
      "General purpose digital input/output pin.",
  },

  {
    id: "D9",
    label: "D9",
    alias: "PWM",
    type: "digital",
    features: ["pwm"],
    description:
      "Digital input/output pin with PWM support.",
  },

  {
    id: "D10",
    label: "D10",
    alias: "PWM / SS",
    type: "digital",
    protocols: ["spi"],
    features: ["pwm"],
    description:
      "Digital pin with PWM support. Can be used as SPI Slave Select.",
  },

  {
    id: "D11",
    label: "D11",
    alias: "PWM / MOSI",
    type: "digital",
    protocols: ["spi"],
    features: ["pwm"],
    description:
      "Digital pin with PWM support and SPI MOSI functionality.",
  },

  {
    id: "D12",
    label: "D12",
    alias: "MISO",
    type: "digital",
    protocols: ["spi"],
    description:
      "Digital pin used as SPI Master In Slave Out.",
  },

  {
    id: "D13",
    label: "D13",
    alias: "SCK / LED",
    type: "digital",
    protocols: ["spi"],
    features: ["built-in-led"],
    description:
      "SPI clock pin connected to the Arduino built-in LED.",
  },

  // =====================================================
  // ANALOG PINS
  // =====================================================

  {
    id: "A0",
    label: "A0",
    type: "analog",
    features: ["adc"],
    description:
      "Analog input channel 0. Can also be used as a digital pin.",
  },

  {
    id: "A1",
    label: "A1",
    type: "analog",
    features: ["adc"],
    description:
      "Analog input channel 1. Can also be used as a digital pin.",
  },

  {
    id: "A2",
    label: "A2",
    type: "analog",
    features: ["adc"],
    description:
      "Analog input channel 2. Can also be used as a digital pin.",
  },

  {
    id: "A3",
    label: "A3",
    type: "analog",
    features: ["adc"],
    description:
      "Analog input channel 3. Can also be used as a digital pin.",
  },

  {
    id: "A4",
    label: "A4",
    alias: "SDA",
    type: "analog",
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
    alias: "Ground",
    type: "ground",
    description:
      "Ground reference pin.",
  },

  {
    id: "GND2",
    label: "GND",
    alias: "Ground",
    type: "ground",
    description:
      "Additional ground reference pin.",
  },

  // =====================================================
  // RESET
  // =====================================================

  {
    id: "RESET",
    label: "RESET",
    type: "digital",
    features: ["reset"],
    description:
      "Resets the microcontroller when pulled low.",
  },
];