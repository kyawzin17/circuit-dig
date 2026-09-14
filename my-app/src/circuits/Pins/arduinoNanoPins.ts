import type { CircuitPin } from "../types/pin.types";

// =====================================================
// ARDUINO NANO PIN DEFINITIONS
// =====================================================

const generateArduinoNanoPins = (): CircuitPin[] => {
  const pins: CircuitPin[] = [];

  // 1. Digital Pins (D0 - D13)
  const pwmPins = [3, 5, 6, 9, 10, 11];

  for (let i = 0; i <= 13; i++) {
    const isPwm = pwmPins.includes(i);
    let desc = `Digital Pin D${i}${isPwm ? " (PWM)" : ""}.`;

    if (i === 0) desc += " Serial RX.";
    else if (i === 1) desc += " Serial TX.";
    else if (i === 10) desc += " SPI SS.";
    else if (i === 11) desc += " SPI MOSI.";
    else if (i === 12) desc += " SPI MISO.";
    else if (i === 13) desc += " SPI SCK / Built-in LED.";

    pins.push({
      id: `pin_${i}`,
      label: `D${i}`,
      alias: `Digital Pin D${i}`,
      type: "terminal",
      direction: "bidirectional",
      description: desc,
    });
  }

  // 2. Analog Inputs (A0 - A7)
  for (let i = 0; i <= 7; i++) {
    let desc = `Analog Input Pin A${i} (10-bit ADC, 0-5V).`;
    if (i === 4) desc += " I2C SDA.";
    else if (i === 5) desc += " I2C SCL.";

    pins.push({
      id: `pin_a${i}`,
      label: `A${i}`,
      alias: `Analog Input A${i}`,
      type: "terminal",
      direction: "passive",
      description: desc,
    });
  }

  // 3. Power, Ground & System Pins
  const powerPins: CircuitPin[] = [
    {
      id: "pin_3v3",
      label: "3.3V",
      alias: "3.3V Power Output",
      type: "power",
      direction: "passive",
      description: "Regulated 3.3V power output pin.",
    },
    {
      id: "pin_5v",
      label: "5V",
      alias: "5V Power Output/Input",
      type: "power",
      direction: "passive",
      description: "Regulated 5V power supply pin.",
    },
    {
      id: "pin_gnd_1",
      label: "GND",
      alias: "Ground 1",
      type: "ground",
      direction: "passive",
      description: "Ground connection pin.",
    },
    {
      id: "pin_gnd_2",
      label: "GND",
      alias: "Ground 2",
      type: "ground",
      direction: "passive",
      description: "Ground connection pin.",
    },
    {
      id: "pin_vin",
      label: "VIN",
      alias: "Voltage Input",
      type: "power",
      direction: "passive",
      description: "Input voltage pin for unregulated external power supply (7-12V).",
    },
    {
      id: "pin_reset",
      label: "RST",
      alias: "Reset Pin",
      type: "terminal",
      direction: "passive",
      description: "Bring this line LOW to reset the microcontroller.",
    },
    {
      id: "pin_aref",
      label: "REF",
      alias: "Analog Reference",
      type: "terminal",
      direction: "passive",
      description: "Reference voltage pin for analog inputs.",
    },
  ];

  return [...pins, ...powerPins];
};

export const arduinoNanoPins: CircuitPin[] = generateArduinoNanoPins();

// =====================================================
// PIN LOOKUP
// =====================================================

export const arduinoNanoPinsById = Object.fromEntries(
  arduinoNanoPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;