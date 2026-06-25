import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import '@wokwi/elements';

// Pin Style ကို Wokwi နဲ့ ပိုတူအောင် (သေးသေးလေးနဲ့ သေသပ်အောင်) ပြင်ထားတယ်
const pinStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  background: '#444',
  border: '1px solid #ccc',
  borderRadius: '1px', // လေးထောင့်ဆန်ဆန်လေး
  minWidth: 0,
  minHeight: 0,
};

// ---------------- Arduino Uno Node ----------------
export const ArduinoNode = memo(() => {
  return (
    <div className="relative" style={{ width: '220px', height: '160px' }}>
      {/* Visual Component */}
      <wokwi-arduino-uno></wokwi-arduino-uno>

      {/* --- Digital Pins (Top) --- */}
      {/* Position.Top လို့ပေးမှ ကြိုးက အပေါ်ကို အရင်တက်မှာပါ */}
      <div className="absolute top-[8px] left-[103px] flex space-x-[5.2px]">
        {[13, 12, 11, 10, 9, 8].map((pin) => (
          <Handle
            key={pin}
            type="source"
            position={Position.Top} // အပေါ်ကို ထွက်မယ်
            id={`d${pin}`}
            style={pinStyle}
            title={`Digital ${pin}`}
          />
        ))}
      </div>

      {/* --- Power/Analog Pins (Bottom) --- */}
      <div className="absolute bottom-[8px] left-[125px] flex space-x-[5.5px]">
         <Handle type="source" position={Position.Bottom} id="gnd" style={pinStyle} title="GND" />
         <Handle type="source" position={Position.Bottom} id="5v" style={pinStyle} title="5V" />
         <Handle type="source" position={Position.Bottom} id="a0" style={pinStyle} title="A0" />
      </div>
    </div>
  );
});

// ---------------- LED Node ----------------
export const LEDNode = memo(({ data }: any) => {
  return (
    <div className="relative w-[30px] h-[50px]">
      {/* Visual LED */}
      <wokwi-led color={data.color || 'red'} value={data.value}></wokwi-led>
      
      {/* Anode Pin (Longer leg - Left) */}
      <Handle 
        type="target" 
        position={Position.Bottom} // အောက်ကို ထွက်မယ်
        id="anode" 
        style={{ ...pinStyle, left: '12px', bottom: '2px' }} 
        title="Anode (+)" 
      />
      
      {/* Cathode Pin (Shorter leg - Right) */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="cathode" 
        style={{ ...pinStyle, left: '22px', bottom: '2px' }} 
        title="Cathode (-)" 
      />
    </div>
  );
});

// ---------------- Waypoint Node (Optional) ----------------
// အစ်ကို့ရဲ့ CirkitEdge မှာ Double-click logic ပါပြီးသားမို့လို့ 
// ဒီ WaypointNode က အပိုဖြစ်သွားနိုင်ပါတယ်။ ဒါပေမဲ့ Manual ထည့်ချင်ရင်တော့ သုံးလို့ရပါတယ်။
export const WaypointNode = memo(() => {
  return (
    <div className="group relative w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md hover:scale-125 transition-all cursor-move">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      {/* Hover လုပ်မှ အရောင်လေး လင်းလာအောင် */}
      <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-0 group-hover:opacity-50"></div>
    </div>
  );
});