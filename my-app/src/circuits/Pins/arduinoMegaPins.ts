import type { CircuitPin } from "../types/pin.types";

// =====================================================
// ARDUINO MEGA 2560 PIN DEFINITIONS
// =====================================================

const generateArduinoMegaPins = (): CircuitPin[] => {
  const pins: CircuitPin[] = [];

  // 1. Digital Pins (0 - 53)
  const pwmPins = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46];

  for (let i = 0; i <= 53; i++) {
    const isPwm = pwmPins.includes(i);
    let desc = `Digital Pin ${i}${isPwm ? " (PWM)" : ""}.`;

    if (i === 0) desc += " Serial RX0.";
    else if (i === 1) desc += " Serial TX0.";
    else if (i === 14) desc += " Serial TX3.";
    else if (i === 15) desc += " Serial RX3.";
    else if (i === 16) desc += " Serial TX2.";
    else if (i === 17) desc += " Serial RX2.";
    else if (i === 18) desc += " Serial TX1.";
    else if (i === 19) desc += " Serial RX1.";
    else if (i === 20) desc += " I2C SDA.";
    else if (i === 21) desc += " I2C SCL.";
    else if (i === 50) desc += " SPI MISO.";
    else if (i === 51) desc += " SPI MOSI.";
    else if (i === 52) desc += " SPI SCK.";
    else if (i === 53) desc += " SPI SS.";

    pins.push({
      id: `pin_${i}`,
      label: `${i}`,
      alias: `Digital Pin ${i}`,
      type: "terminal",
      direction: "bidirectional",
      description: desc,
    });
  }

  // 2. Analog Inputs (A0 - A15)
  for (let i = 0; i <= 15; i++) {
    pins.push({
      id: `pin_a${i}`,
      label: `A${i}`,
      alias: `Analog Input A${i}`,
      type: "terminal",
      direction: "passive",
      description: `Analog Input Pin A${i} (10-bit ADC, 0-5V).`,
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
      alias: "Ground (Power Header 1)",
      type: "ground",
      direction: "passive",
      description: "Ground connection pin.",
    },
    {
      id: "pin_gnd_2",
      label: "GND",
      alias: "Ground (Power Header 2)",
      type: "ground",
      direction: "passive",
      description: "Ground connection pin.",
    },
    {
      id: "pin_gnd_3",
      label: "GND",
      alias: "Ground (Digital Header)",
      type: "ground",
      direction: "passive",
      description: "Ground connection pin near Pin 53.",
    },
    {
      id: "pin_vin",
      label: "VIN",
      alias: "Voltage Input",
      type: "power",
      direction: "passive",
      description: "Input voltage pin when using external power supply (7-12V).",
    },
    {
      id: "pin_reset",
      label: "RESET",
      alias: "Reset Pin",
      type: "terminal",
      direction: "passive",
      description: "Bring this line LOW to reset the microcontroller.",
    },
    {
      id: "pin_ioref",
      label: "IOREF",
      alias: "I/O Reference Voltage",
      type: "power",
      direction: "passive",
      description: "Reference voltage (5V) for board shields.",
    },
    {
      id: "pin_aref",
      label: "AREF",
      alias: "Analog Reference",
      type: "terminal",
      direction: "passive",
      description: "Reference voltage pin for analog inputs.",
    },
  ];

  return [...pins, ...powerPins];
};

export const arduinoMegaPins: CircuitPin[] = generateArduinoMegaPins();

// =====================================================
// PIN LOOKUP
// =====================================================

export const arduinoMegaPinsById = Object.fromEntries(
  arduinoMegaPins.map((pin) => [pin.id, pin])
) as Record<string, CircuitPin>;