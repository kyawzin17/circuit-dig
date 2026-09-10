// import React, { memo } from 'react';
// import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow';
// import { PIN_CONFIGS } from './constants/pins/index';
// import { useEffect } from 'react';

// const ElectronicNode = ({ id, data }: NodeProps) => {
//   const pins = PIN_CONFIGS[data.componentType] || [];
//   const rotation= data.rotation || 0;
//   const updateNodeInternals = useUpdateNodeInternals();

//   useEffect(() => {
//     const timer= setTimeout(() => {
//       updateNodeInternals(id);
//     }, 300);
//     return () => clearTimeout(timer);
//   }, [rotation, updateNodeInternals, id]);

//   const getHandlePosition = (side: string) => {
//     switch (side) {
//       case 'top': return Position.Top;
//       case 'bottom': return Position.Bottom;
//       case 'left': return Position.Left;
//       case 'right': return Position.Right;
//       default: return Position.Top;
//     }
//   };

//   return (
//       <div style={{
//         transform: `rotate(${rotation}deg)`,
//         transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth ဖြစ်အောင်
//       }}
//             className='border-2 border-transparent hover:border-blue-400/60 relative' >
//               {/* style={{ 
//           transform: `rotate(${rotation}deg)`, 
//           transition: 'transform 0.2s ease' // လှည့်တဲ့အခါ Smooth ဖြစ်အောင်
//         }} */}
//       <div>
//         {React.createElement(data.tag, { ...data.props })}
        
//         {/* Pins (Handles) တည်ဆောက်ခြင်း */}
//         {pins.map((pin) => (
//           <div
//             key={pin.name}>
//             <Handle
//               id={pin.name}
//               type="source" // ကြိုးက အဝင်ရော အထွက်ရော လုပ်လို့ရအောင်
//               position={getHandlePosition(pin.dir)} // နေရာက coordinate နဲ့ ချိန်မှာမလို့ position က default ထားလို့ရပါတယ်
//               className="absolute" 
//               title={pin.name}
//               style={{ 
//                 transform: 'translate(-50%, -50%)',
//                 width: "6px",
//                 height: "6px",
//                 borderRadius: '2px',
//                 pointerEvents: 'all',
//                  left: `${pin.x}px`, top: `${pin.y}px`
//               }}
//               data-signals={JSON.stringify(pin.signals)}
//             />
//             {/* Hover လုပ်ရင် Pin Name ပြရန် */}
//             <span className="absolute -top-9 left-1/2 -translate-x-1/2 text-[8px] bg-black/80 text-white px-1 rounded opacity-0 hover:opacity-100 whitespace-nowrap">
//               {data.label}
//             </span>
//           </div>
//         ))}
//         </div>
//       </div>
//   );
// };

// export default memo(ElectronicNode);



import React, { memo, useEffect } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from "reactflow";

import { PIN_CONFIGS } from "./constants/pins";

/* =====================================================
   TYPES
===================================================== */

type PinDefinition = {
  name: string;
  x: number;
  y: number;
  dir: string;

  signals?: unknown[];
  source?: unknown[];
};

/* =====================================================
   COMPONENT
===================================================== */

const ElectronicNode = ({
  id,
  data,
}: NodeProps) => {
  /* ===================================================
     PIN CONFIG
  =================================================== */

  const pins: PinDefinition[] =
    (PIN_CONFIGS[data.componentType] as PinDefinition[]) ??
    [];

  /* ===================================================
     ROTATION
  =================================================== */

  const rotation =
    typeof data.rotation === "number"
      ? data.rotation
      : 0;

  /* ===================================================
     REACT FLOW INTERNALS
  =================================================== */

  const updateNodeInternals =
    useUpdateNodeInternals();

  useEffect(() => {
     const timer= setTimeout(() => {
       updateNodeInternals(id);
     }, 300);
     return () => clearTimeout(timer);
   }, [rotation, updateNodeInternals, id]);

   const getHandlePosition = (side: string) => {
     switch (side) {
       case 'top': return Position.Top;
       case 'bottom': return Position.Bottom;
       case 'left': return Position.Left;
       case 'right': return Position.Right;
       default: return Position.Top;
     }
   };

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div
      style={{
         transform: `rotate(${rotation}deg)`,
         transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth ဖြစ်အောင်
       }}
             className='border-2 border-transparent hover:border-blue-400/60 relative'
    >
      {/* =================================================
          COMPONENT BODY
      ================================================= */}

      <div className="relative">
        {data.tag &&
          React.createElement(
            data.tag,
            {
              ...(data.props ?? {}),
            }
          )}

        {/* ===============================================
            PINS / HANDLES
        =============================================== */}

        {pins.map((pin) => {
          /*
           * IMPORTANT
           *
           * pin.name is the canonical pin ID.
           *
           * Arduino:
           *   D13 → D13
           *
           * Resistor:
           *   A → A
           *   B → B
           */

          const handleId = pin.name;

          return (
            <React.Fragment
              key={handleId}
            >
              {/* =========================================
                  REACT FLOW HANDLE
              ========================================= */}

              <Handle
               id={pin.name}
               type="source" // ကြိုးက အဝင်ရော အထွက်ရော လုပ်လို့ရအောင်
               position={getHandlePosition(pin.dir)} // နေရာက coordinate နဲ့ ချိန်မှာမလို့ position က default ထားလို့ရပါတယ်
               className="absolute" 
               title={pin.name}
               style={{ 
                 transform: 'translate(-50%, -50%)',
                 width: "6px",
                 height: "6px",
                 borderRadius: '2px',
                 pointerEvents: 'all',
                  left: `${pin.x}px`, top: `${pin.y}px`,
                   zIndex: 20,
               }}
                 
                data-pin-id={handleId}
                data-pin-name={handleId}
                data-signals={JSON.stringify(
                  pin.signals ?? []
                )}
              />

              {/* =========================================
                  PIN LABEL
              ========================================= */}

              <span
                className="
                  pointer-events-none
                  absolute
                  -top-9
                  left-1/2
                  z-30
                  -translate-x-1/2

                  whitespace-nowrap

                  rounded
                  bg-black/90

                  px-1.5
                  py-0.5

                  text-[8px]
                  font-medium
                  text-white

                  opacity-0
                  transition-opacity

                  group-hover:opacity-100
                "
              >
                {handleId}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* =====================================================
   EXPORT
===================================================== */

export default memo(ElectronicNode);