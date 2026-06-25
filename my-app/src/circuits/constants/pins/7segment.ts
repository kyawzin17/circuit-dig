
// Helper function: Wokwi ရဲ့ မူရင်း Logic အတိုင်း x, y, dir ကို တွက်ပေးမည့်လုပ်ဆောင်ချက်
const createPinPositions = (digits: number, pinsSetting: 'top' | 'extend' | 'none' = 'top') => {
    const mmToPix = 3.78;
  const numPins = digits === 4 ? 14 : digits === 3 ? 12 : 10;
  const cols = Math.ceil(numPins / 2);
  const startX = (12.55 * digits - cols * 2.54) / 2;
  const bottomY = pinsSetting === 'extend' ? 21 : 18;

  return (n: number) => {
    const col = (n - 1) % cols;
    const row = 1 - Math.floor((n - 1) / cols);
    const xOffset = 1.27;
    
    const x = startX + xOffset + (row ? col : cols - col - 1) * 2.54;
    const y = pinsSetting === 'top' ? (row ? bottomY + 1 : 1) : row ? bottomY + 2 : 0;
    
    return {
      x: Math.round(x * mmToPix * 100) / 100, // ဒသမ ၂ နေရာအထိ ဖြတ်ယူခြင်း
      y: Math.round(y * mmToPix * 100) / 100,
      dir: row === 1 ? 'bottom' : 'top', // row 1 ဆိုရင် အောက်ပင်၊ row 0 ဆိုရင် အပေါ်ပင်
    };
  };
};

// ==========================================
// 1-Digit Display Pins Configuration
// ==========================================
const pinXY1 = createPinPositions(1);
export default [
  { name: 'COM.1',x: pinXY1(3).x, y: pinXY1(3).y, signals: [], dir: pinXY1(3).dir },
  { name: 'COM.2',x: pinXY1(8).x, y: pinXY1(8).y, signals: [], dir: pinXY1(8).dir },
  { name: 'A', x: pinXY1(7).x, y: pinXY1(7).y, signals: [], dir: pinXY1(7).dir },
  { name: 'B', x: pinXY1(6).x, y: pinXY1(6).y, signals: [], dir: pinXY1(6).dir },
  { name: 'C', x: pinXY1(4).x, y: pinXY1(4).y, signals: [], dir: pinXY1(4).dir },
  { name: 'D', x: pinXY1(2).x, y: pinXY1(2).y, signals: [], dir: pinXY1(2).dir },
  { name: 'E', x: pinXY1(1).x, y: pinXY1(1).y, signals: [], dir: pinXY1(1).dir },
  { name: 'F', x: pinXY1(9).x, y: pinXY1(9).y, signals: [], dir: pinXY1(9).dir },
  { name: 'G', x: pinXY1(10).x, y: pinXY1(10).y, signals: [], dir: pinXY1(10).dir },
  { name: 'DP', x: pinXY1(5).x, y: pinXY1(5).y, signals: [], dir: pinXY1(5).dir },
];

// ==========================================
// 2-Digit Display Pins Configuration
// ==========================================
const pinXY2 = createPinPositions(2);
export const SEVEN_SEGMENT_2DIGIT = [
  { name: 'DIG1', ...pinXY2(8), signals: [] },
  { name: 'DIG2', ...pinXY2(7), signals: [] },
  { name: 'A', ...pinXY2(10), signals: [] },
  { name: 'B', ...pinXY2(9), signals: [] },
  { name: 'C', ...pinXY2(1), signals: [] },
  { name: 'D', ...pinXY2(4), signals: [] },
  { name: 'E', ...pinXY2(3), signals: [] },
  { name: 'F', ...pinXY2(6), signals: [] },
  { name: 'G', ...pinXY2(5), signals: [] },
  { name: 'DP', ...pinXY2(2), signals: [] },
];

// ==========================================
// 3-Digit Display Pins Configuration
// ==========================================
const pinXY3 = createPinPositions(3);
export const SEVEN_SEGMENT_3DIGIT = [
  { name: 'A', ...pinXY3(11), signals: [] },
  { name: 'B', ...pinXY3(7), signals: [] },
  { name: 'C', ...pinXY3(4), signals: [] },
  { name: 'D', ...pinXY3(2), signals: [] },
  { name: 'E', ...pinXY3(1), signals: [] },
  { name: 'F', ...pinXY3(10), signals: [] },
  { name: 'G', ...pinXY3(5), signals: [] },
  { name: 'DP', ...pinXY3(3), signals: [] },
  { name: 'DIG1', ...pinXY3(12), signals: [] },
  { name: 'DIG2', ...pinXY3(9), signals: [] },
  { name: 'DIG3', ...pinXY3(8), signals: [] },
];

// ==========================================
// 4-Digit Display Pins Configuration
// ==========================================
const pinXY4 = createPinPositions(4);
export const SEVEN_SEGMENT_4DIGIT = [
  { name: 'A', ...pinXY4(13), signals: [] },
  { name: 'B', ...pinXY4(9), signals: [] },
  { name: 'C', ...pinXY4(4), signals: [] },
  { name: 'D', ...pinXY4(2), signals: [] },
  { name: 'E', ...pinXY4(1), signals: [] },
  { name: 'F', ...pinXY4(12), signals: [] },
  { name: 'G', ...pinXY4(5), signals: [] },
  { name: 'DP', ...pinXY4(3), signals: [] },
  { name: 'DIG1', ...pinXY4(14), signals: [] },
  { name: 'DIG2', ...pinXY4(11), signals: [] },
  { name: 'DIG3', ...pinXY4(10), signals: [] },
  { name: 'DIG4', ...pinXY4(6), signals: [] },
  { name: 'COM', ...pinXY4(7), signals: [] },
  { name: 'CLN', ...pinXY4(8), signals: [] },
];
