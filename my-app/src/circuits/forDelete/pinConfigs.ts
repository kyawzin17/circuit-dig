// constants/pinConfigs.ts

export const PIN_CONFIGS: Record<string, { x: number; y: number; id: string; side: string; }[]> = {
  'wokwi-arduino-uno': [
    // Digital Pins (ညာဘက်အပေါ်)
    { id: 'D0', x: 256, y: 14 ,side: "top" }, { id: 'D1', x: 246, y: 14,side: "top" }, { id: 'D2', x: 236, y: 14,side: "top" },
    { id: 'D3', x: 226, y: 14 ,side: "top"}, { id: 'D4', x: 216, y: 14,side: "top"}, { id: 'D5', x: 206, y: 14 ,side: "top"},
    { id: 'D6', x: 196, y: 14 ,side: "top"}, { id: 'D7', x: 188, y: 14,side: "top"}, { id: 'D8', x: 172, y: 14,side: "top"},
    { id: 'D9', x: 162, y: 14 ,side: "top"}, { id: 'D10', x: 152, y: 14,side: "top"}, { id: 'D11', x: 142, y: 14,side: "top"},
    { id: 'D12', x: 132, y: 14 ,side: "top"}, { id: 'D13', x: 124, y: 14 ,side: "top"}, { id: 'GND1', x: 114, y: 14 ,side: "top"},
    { id: 'AREF', x: 104, y: 14 ,side: "top"},{ id: 'GND2', x: 96, y: 14 ,side: "top"},{ id: 'GND3', x: 86, y: 14 ,side: "top"},
    // Power & Analog (ဘယ်ဘက်အောက်)
    { id: 'GND', x: 120, y: 194 ,side: "bottom" },{ id: 'IDREF', x: 130, y: 194 ,side: "bottom" },
    { id: 'RESET', x: 140, y: 194 ,side: "bottom" }, { id: '3V3', x: 148, y: 194 ,side: "bottom" }, { id: '5V', x: 158, y: 194 ,side: "bottom" },
    { id: 'GND4', x: 168, y: 194 ,side: "bottom" }, { id: 'GND5', x: 178, y: 194 ,side: "bottom" }, { id: 'VIN', x: 188, y: 194 ,side: "bottom" },
    { id: 'A0', x: 206, y: 194 ,side: "bottom" }, { id: 'A1', x: 216, y: 194 ,side: "bottom" }, { id: 'A2', x: 226, y: 194 ,side: "bottom" }, 
    { id: 'A3', x: 236, y: 194 ,side: "bottom" }, { id: 'A4', x: 246, y: 194 ,side: "bottom" }, { id: 'A5', x: 256, y: 194 ,side: "bottom" },
  ],
  'wokwi-led': [
    { id: 'anode', x: 16, y: 45 ,side: "bottom" }, // အဖိုတိုင်
    { id: 'cathode', x: 26, y: 45 ,side: "bottom"}, // အမတိုင်
  ],
  'wokwi-potentiometer': [
    { id: 'sig', x: 18, y: 45 ,side: "bottom" },
    { id: 'vcc', x: 5, y: 45 ,side: "bottom" },
    { id: 'gnd', x: 31, y: 45 ,side: "bottom" },
  ],
  // ကျန်တဲ့ ၁၆ ခုအတွက်လည်း ဒီအတိုင်း Coordinate တွေ ထည့်ပေးရပါမယ်
 "wokwi-arduino-mega": [
  // --- TOP PINS (Digital & Communication) ---
  { id: 'SCL', x: 90, y: 9, side: "top" },
  { id: 'SDA', x: 100, y: 9, side: "top" },
  { id: 'AREF', x: 109, y: 9, side: "top" },
  { id: 'GND', x: 119, y: 9, side: "top" },
  { id: '13', x: 129, y: 9, side: "top" },
  { id: '12', x: 138, y: 9, side: "top" },
  { id: '11', x: 148, y: 9, side: "top" },
  { id: '10', x: 157.5, y: 9, side: "top" },
  { id: '9', x: 167.5, y: 9, side: "top" },
  { id: '8', x: 177, y: 9, side: "top" },
  { id: '7', x: 190, y: 9, side: "top" },
  { id: '6', x: 200, y: 9, side: "top" },
  { id: '5', x: 209.5, y: 9, side: "top" },
  { id: '4', x: 219, y: 9, side: "top" },
  { id: '3', x: 228.5, y: 9, side: "top" },
  { id: '2', x: 238, y: 9, side: "top" },
  { id: '1', x: 247.5, y: 9, side: "top" },
  { id: '0', x: 257.5, y: 9, side: "top" },
  { id: '14', x: 270.5, y: 9, side: "top" },
  { id: '15', x: 280, y: 9, side: "top" },
  { id: '16', x: 289.5, y: 9, side: "top" },
  { id: '17', x: 299, y: 9, side: "top" },
  { id: '18', x: 308.5, y: 9, side: "top" },
  { id: '19', x: 318.5, y: 9, side: "top" },
  { id: '20', x: 328, y: 9, side: "top" },
  { id: '21', x: 337.5, y: 9, side: "top" },

  // --- RIGHT SIDE PINS (Digital 22-53 & Power) ---
  // 2x18 Header Block
  { id: '5V.1', x: 361, y: 8, side: "right" },
  { id: '5V.2', x: 371, y: 8, side: "right" },
  ...Array.from({ length: 16 }, (_, i) => [
    { id: `${22 + i * 2}`, x: 361, y: 17.5 + i * 9.5, side: "right" },
    { id: `${23 + i * 2}`, x: 371, y: 17.5 + i * 9.5, side: "right" }
  ]).flat(),
  { id: 'GND.4', x: 361, y: 171.25, side: "right" },
  { id: 'GND.5', x: 371, y: 171.25, side: "right" },

  // --- BOTTOM PINS (Power & Analog In) ---
  { id: 'IOREF', x: 136, y: 184.5, side: "bottom" },
  { id: 'RESET', x: 145.5, y: 184.5, side: "bottom" },
  { id: '3.3V', x: 155, y: 184.5, side: "bottom" },
  { id: '5V', x: 164.5, y: 184.5, side: "bottom" },
  { id: 'GND.2', x: 174.25, y: 184.5, side: "bottom" },
  { id: 'GND.3', x: 183.75, y: 184.5, side: "bottom" },
  { id: 'VIN', x: 193.5, y: 184.5, side: "bottom" },
  { id: 'A0', x: 208.5, y: 184.5, side: "bottom" },
  { id: 'A1', x: 218, y: 184.5, side: "bottom" },
  { id: 'A2', x: 227.5, y: 184.5, side: "bottom" },
  { id: 'A3', x: 237.25, y: 184.5, side: "bottom" },
  { id: 'A4', x: 246.75, y: 184.5, side: "bottom" },
  { id: 'A5', x: 256.25, y: 184.5, side: "bottom" },
  { id: 'A6', x: 266, y: 184.5, side: "bottom" },
  { id: 'A7', x: 275.5, y: 184.5, side: "bottom" },
  { id: 'A8', x: 290.25, y: 184.5, side: "bottom" },
  { id: 'A9', x: 300, y: 184.5, side: "bottom" },
  { id: 'A10', x: 309.5, y: 184.5, side: "bottom" },
  { id: 'A11', x: 319.25, y: 184.5, side: "bottom" },
  { id: 'A12', x: 328.75, y: 184.5, side: "bottom" },
  { id: 'A13', x: 338.5, y: 184.5, side: "bottom" },
  { id: 'A14', x: 348, y: 184.5, side: "bottom" },
  { id: 'A15', x: 357.75, y: 184.5, side: "bottom" },
],
}