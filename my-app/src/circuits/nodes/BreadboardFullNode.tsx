
import React from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow';
import { useEffect } from 'react';

const BreadboardFullNode = ({ id, data }: NodeProps) => {

  const rotation = data.rotation || 0;
   const updateNodeInternals = useUpdateNodeInternals();
  
    useEffect(() => {
      const timer= setTimeout(() => {
        updateNodeInternals(id);
      }, 300);
      return () => clearTimeout(timer);
      
    }, [rotation, updateNodeInternals, id]);
  // 🌟 [အရေးကြီး] ဒီနေရာက SCALE တန်ဖိုးကို ပြောင်းပြီး စိတ်ကြိုက်အကျဉ်းအကျယ် လုပ်နိုင်ပါတယ်။
  // 0.6 ဆိုရင် မူရင်းဆိုဒ်ရဲ့ 60% (တော်တော်လေး အနေတော်ဖြစ်သွားပါမယ်)၊ ပိုသေးချင်ရင် 0.5 လို့ ပြောင်းပါ။
  const SCALE = 0.5; 

  const rows = Array.from({ length: 63 }, (_, i) => i + 1);

  const leftCols = [
    { label: 'A', x: 90 }, { label: 'B', x: 110 }, { label: 'C', x: 130 }, { label: 'D', x: 150 }, { label: 'E', x: 170 }
  ];
  const rightCols = [
    { label: 'F', x: 270 }, { label: 'G', x: 290 }, { label: 'H', x: 310 }, { label: 'I', x: 330 }, { label: 'J', x: 350 }
  ];

  const powerCols = [
    { id: 'gnd-l', x: 30, type: 'gnd' },
    { id: 'vcc-l', x: 50, type: 'vcc' },
    { id: 'vcc-r', x: 390, type: 'vcc' },
    { id: 'gnd-r', x: 410, type: 'gnd' }
  ];

  const getRowY = (row: number) => 30 + row * 20;

  // SCALE အလိုက် တွက်ချက်ထားသော အကျယ် နှင့် အမြင့်
  const nodeWidth = 440 * SCALE;
  const nodeHeight = 1340 * SCALE;

  return (
    <div
      style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth ဖြစ်အောင်
           width: `${nodeWidth}px`, height: `${nodeHeight}px` , 
        }}
       className="relative bg-transparent border-2 border-red-500" >
      
      {/* --- ၁။ BREADBOARD SVG VISUALS --- */}
      {/* viewBox ကို 440 1340 အတိုင်းထားပြီး width/height ကိုပဲ scale နဲ့ မြှောက်ပေးထားလို့ SVG ရုပ်ထွက်က အလိုအလျောက် သေးသွားပါမယ် */}
      <svg viewBox="0 0 440 1340" width={nodeWidth} height={nodeHeight} className="absolute top-0 left-0 pointer-events-none">
        <defs>
          <g id="wokwi-3d-hole">
            <rect x="0" y="0" width="11" height="11" rx="1" fill="#FFFFFF" opacity="0.9"/>
            <rect x="-1" y="-1" width="11" height="11" rx="1" fill="#A0A0A0" opacity="0.5"/>
            <rect x="0" y="0" width="10" height="10" rx="1" fill="#242424"/>
            <rect x="0" y="0" width="9" height="2" fill="#121212"/>
            <rect x="0" y="0" width="2" height="9" fill="#121212"/>
          </g>
        </defs>

        <rect x="0" y="0" width="440" height="1340" rx="12" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="2"/>
        <rect x="212" y="40" width="16" height="1260" rx="2" fill="#CDD1D6"/>

        <line x1="20" y1="45" x2="20" y2="1295" stroke="#3498DB" strokeWidth="2" strokeLinecap="round"/>
        <line x1="65" y1="45" x2="65" y2="1295" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
        <line x1="375" y1="45" x2="375" y2="1295" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
        <line x1="420" y1="45" x2="420" y2="1295" stroke="#3498DB" strokeWidth="2" strokeLinecap="round"/>

        {rows.map((row) => {
          const y = getRowY(row);
          return (
            <g key={`row-group-${row}`}>
              <text x="198" y={y + 8} fontFamily="Arial" fontSize="10" fontWeight="bold" fill="#6B7280" textAnchor="middle">{row}</text>
              <text x="242" y={y + 8} fontFamily="Arial" fontSize="10" fontWeight="bold" fill="#6B7280" textAnchor="middle">{row}</text>

              {powerCols.map((p) => (
                <use key={`${p.id}-${row}`} href="#wokwi-3d-hole" x={p.x - 5} y={y - 5} />
              ))}
              {leftCols.map((c) => (
                <use key={`col-${c.label}-${row}`} href="#wokwi-3d-hole" x={c.x - 5} y={y - 5} />
              ))}
              {rightCols.map((c) => (
                <use key={`col-${c.label}-${row}`} href="#wokwi-3d-hole" x={c.x - 5} y={y - 5} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* --- ၂။ REACT FLOW INTERACTIVE HANDLES --- */}
      {/* ပုံသေးသွားတဲ့အလျောက် Handles တွေရဲ့ နေရာ (left, top, width, height) အားလုံးကို SCALE နဲ့ လိုက်မြှောက်ပေးထားပါတယ် */}
      {rows.map((row) => {
        const y = getRowY(row);

        return (
          <React.Fragment key={`handles-${row}`}>
            {/* Power Handles */}
            {powerCols.map((p) => (
              <Handle
                key={`h-${p.id}-${row}`}
                type="source"
                position={Position.Top}
                id={`${p.type}_${p.id}_${row}`}
                style={{
                  left: `${p.x * SCALE}px`,
                  top: `${y * SCALE}px`,
                  width: `${10 * SCALE}px`,
                  height: `${10 * SCALE}px`,
                  transform: `translate(${-5 * SCALE}px, ${-5 * SCALE}px)`,
                  background: 'transparent',
                  border: 'none',
                  minWidth: 0,
                  minHeight: 0,
                  cursor: 'crosshair',
                  zIndex: 10
                }}
              />
            ))}

            {/* Left Column Handles (A-E) */}
            {leftCols.map((c) => (
              <Handle
                key={`h-${c.label}-${row}`}
                type="source"
                position={Position.Top}
                id={`pin_${c.label}${row}`}
                style={{
                  left: `${c.x * SCALE}px`,
                  top: `${y * SCALE}px`,
                  width: `${10 * SCALE}px`,
                  height: `${10 * SCALE}px`,
                  transform: `translate(${-5 * SCALE}px, ${-5 * SCALE}px)`,
                  background: 'transparent',
                  border: 'none',
                  minWidth: 0,
                  minHeight: 0,
                  cursor: 'crosshair',
                  zIndex: 10
                }}
              />
            ))}

            {/* Right Column Handles (F-J) */}
            {rightCols.map((c) => (
              <Handle
                key={`h-${c.label}-${row}`}
                type="source"
                position={Position.Top}
                id={`pin_${c.label}${row}`}
                style={{
                  left: `${c.x * SCALE}px`,
                  top: `${y * SCALE}px`,
                  width: `${10 * SCALE}px`,
                  height: `${10 * SCALE}px`,
                  transform: `translate(${-5 * SCALE}px, ${-5 * SCALE}px)`,
                  background: 'transparent',
                  border: 'none',
                  minWidth: 0,
                  minHeight: 0,
                  cursor: 'crosshair',
                  zIndex: 10
                }}
              />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default BreadboardFullNode;