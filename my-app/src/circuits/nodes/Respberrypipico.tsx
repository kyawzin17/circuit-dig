import React, { useEffect } from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow';
import respberryPico from '../../assets/respberry.svg';

const PicoNode = ({ id, data }: NodeProps) => {
  const rotation = data.rotation || 0;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 300);
    return () => clearTimeout(timer);
  }, [rotation, updateNodeInternals, id]);

  // 🌟 အရွယ်အစား ချိန်ညှိရန် (အခြား Component များနှင့် အချိုးညီစေရန်)
  const SCALE = 0.6; 

  // ပုံအစစ်၏ မူရင်းအရွယ်အစား (Pixel) - မိမိပုံအရွယ်အစားပေါ်မူတည်၍ ပြင်နိုင်ပါသည်
  const IMAGE_WIDTH = 210; 
  const IMAGE_HEIGHT = 510; 

  const nodeWidth = IMAGE_WIDTH * SCALE;
  const nodeHeight = IMAGE_HEIGHT * SCALE;

  // 🌟 Pin များ နေရာချထားခြင်း (ပုံအစစ်ပေါ်ရှိ အပေါက်များနှင့် အတိအကျ ကိုက်ညီစေရန် ဤတန်ဖိုးများကို အနည်းငယ် အတိုးအလျှော့ လုပ်ပေးပါ)
  const TOP_PADDING = 59; // ပထမဆုံး Pin ၏ အပေါ်မှ အကွာအဝေး
  const PIN_SPACING = 20.8; // Pin တစ်ခုနှင့် တစ်ခုကြား အကွာအဝေး
  
  const LEFT_PIN_X = 9;  // ဘယ်ဘက် Pin များ၏ X နေရာ (ဘေးအစွန်)
  const RIGHT_PIN_X = 198; // ညာဘက် Pin များ၏ X နေရာ (ဘေးအစွန်)

  const LEFT_PINS = [
    'GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7',
    'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15'
  ];

  const RIGHT_PINS = [
    'VBUS', 'VSYS', 'GND', '3V3_EN', '3V3_OUT', 'ADC_VREF', 'GP28', 'GND', 'GP27', 'GP26',
    'RUN', 'GP22', 'GND', 'GP21', 'GP20', 'GP19', 'GP18', 'GND', 'GP17', 'GP16'
  ];

  return (
    <div
      className="relative bg-transparent border-2 border-transparent hover:border-blue-400/60 rounded-md"
      style={{
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
      }}
    >
      {/* --- ၁။ REALISTIC IMAGE --- */}
      {/* မိမိ၏ public folder သို့မဟုတ် assets ထဲရှိ Background အကြည် Pico ပုံကို ဤနေရာတွင် ထည့်ပါ */}
      <img 
        src={respberryPico} 
        alt="Raspberry Pi Pico" 
        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
        style={{ filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.3))' }} // 3D Effect ရစေရန် အရိပ်ထည့်ထားသည်
      />

      {/* --- ၂။ INTERACTIVE HANDLES (Pins) --- */}
      
      {/* Left Column Handles */}
      {LEFT_PINS.map((pinLabel, index) => (
        <Handle
          key={`h-left-${pinLabel}`}
          type="source"
          position={Position.Left}
          id={pinLabel}
          style={{
            left: `${LEFT_PIN_X * SCALE}px`,
            top: `${(TOP_PADDING + index * PIN_SPACING) * SCALE}px`,
            width: `${14 * SCALE}px`,
            height: `${14 * SCALE}px`,
            transform: `translate(-50%, -50%)`, // အလယ်တည့်တည့်သို့ ရွှေ့သည်
            background: 'rgba(255, 0, 0, 1)', // 🌟 ပုံမှန်ဆိုလျှင် အမြင်ဖျောက်ထားမည်။ Test လုပ်ချင်ပါက 'rgba(255,0,0,0.5)' ပေး၍ စစ်ဆေးပါ။
            border: 'none',
            minWidth: 0,
            minHeight: 0,
            cursor: 'crosshair',
            zIndex: 10
          }}
        />
      ))}

      {/* Right Column Handles */}
      {RIGHT_PINS.map((pinLabel, index) => (
        <Handle
          key={`h-right-${pinLabel}`}
          type="source"
          position={Position.Right}
          id={pinLabel}
          style={{
            left: `${RIGHT_PIN_X * SCALE}px`,
            top: `${(TOP_PADDING + index * PIN_SPACING) * SCALE}px`,
            width: `${14 * SCALE}px`,
            height: `${14 * SCALE}px`,
            transform: `translate(-50%, -50%)`,
            background: 'rgba(255, 0, 0, 1)', 
            border: 'none',
            minWidth: 0,
            minHeight: 0,
            cursor: 'crosshair',
            zIndex: 10
          }}
        />
      ))}
    </div>
  );
};

export default PicoNode;