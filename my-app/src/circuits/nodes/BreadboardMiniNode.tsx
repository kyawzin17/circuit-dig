import React from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow';
import { useEffect } from 'react';

const BreadboardMiniNode = ({ id, data }: NodeProps) => {
  const rotation = data.rotation || 0;
   const updateNodeInternals = useUpdateNodeInternals();
   
   useEffect(() => {
      const timer= setTimeout(() => {
        updateNodeInternals(id);
      }, 300);
      return () => clearTimeout(timer);
      
    }, [rotation, updateNodeInternals, id]);
   
  // 🌟 SCALE တန်ဖိုးကို အခြားဘုတ်များအတိုင်း 0.6 ပဲ ထားရှိပေးထားပါတယ်
  const SCALE = 0.5; 

  // Mini Breadboard တွင် ပုံမှန်အားဖြင့် အတန်းပေါင်း ၁၇ တန်း ပါဝင်သည်
  const rows = Array.from({ length: 17 }, (_, i) => i + 1);

  const leftCols = [
    { label: 'A', x: 90 }, { label: 'B', x: 110 }, { label: 'C', x: 130 }, { label: 'D', x: 150 }, { label: 'E', x: 170 }
  ];
  const rightCols = [
    { label: 'F', x: 270 }, { label: 'G', x: 290 }, { label: 'H', x: 310 }, { label: 'I', x: 330 }, { label: 'J', x: 350 }
  ];

  const getRowY = (row: number) => 30 + row * 20;

  // Mini Board အတွက် အမြင့်ကို 420px သို့ ကျုံ့ထားသည်
  const nodeWidth = 440 * SCALE;
  const nodeHeight = 420 * SCALE;

  return (
    <div className="relative bg-transparent border-2 border-transparent hover:border-blue-400/70"
         style={{ 
                  width: `${nodeWidth}px`,
                   height: `${nodeHeight}px`,
                   transform: `rotate(${rotation}deg)`,
                   transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth ဖြစ်အောင်
                   }}>
      
      {/* --- ၁။ BREADBOARD SVG VISUALS --- */}
      <svg viewBox="0 0 440 420" width={nodeWidth} height={nodeHeight} className="absolute top-0 left-0 pointer-events-none">
        <defs>
          <g id="wokwi-3d-hole">
            <rect x="0" y="0" width="11" height="11" rx="1" fill="#FFFFFF" opacity="0.9"/>
            <rect x="-1" y="-1" width="11" height="11" rx="1" fill="#A0A0A0" opacity="0.5"/>
            <rect x="0" y="0" width="10" height="10" rx="1" fill="#242424"/>
            <rect x="0" y="0" width="9" height="2" fill="#121212"/>
            <rect x="0" y="0" width="2" height="9" fill="#121212"/>
          </g>
        </defs>

        {/* Board Base Panel */}
        <rect x="0" y="0" width="440" height="420" rx="12" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="2"/>
        
        {/* Center Trench Divider (အလယ်မြောင်းတိုလေး) */}
        <rect x="212" y="40" width="16" height="340" rx="2" fill="#CDD1D6"/>

        {rows.map((row) => {
          const y = getRowY(row);
          return (
            <g key={`row-group-${row}`}>
              {/* Row Numbers */}
              <text x="198" y={y + 8} fontFamily="Arial" fontSize="10" fontWeight="bold" fill="#6B7280" textAnchor="middle">{row}</text>
              <text x="242" y={y + 8} fontFamily="Arial" fontSize="10" fontWeight="bold" fill="#6B7280" textAnchor="middle">{row}</text>

              {/* Left Column Holes (A-E) */}
              {leftCols.map((c) => (
                <use key={`col-${c.label}-${row}`} href="#wokwi-3d-hole" x={c.x - 5} y={y - 5} />
              ))}

              {/* Right Column Holes (F-J) */}
              {rightCols.map((c) => (
                <use key={`col-${c.label}-${row}`} href="#wokwi-3d-hole" x={c.x - 5} y={y - 5} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* --- ၂။ REACT FLOW INTERACTIVE HANDLES --- */}
      {rows.map((row) => {
        const y = getRowY(row);

        return (
          <React.Fragment key={`handles-${row}`}>
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

export default BreadboardMiniNode;