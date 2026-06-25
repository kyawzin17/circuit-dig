import React, { useState, useEffect, useCallback, useRef } from 'react';
import { type EdgeProps, BaseEdge, EdgeLabelRenderer, Position, useReactFlow, useStore } from 'reactflow';

type Point = { x: number; y: number };

const GRID_SIZE = 10; 
const CORNER_RADIUS = 8; 
const STUB_LENGTH = 0; 
const HANDLE_RADIUS = 2.8; 

function createRoundedPath(points: Point[], radius: number) {
  if (points.length < 2) return '';
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len1 === 0 || len2 === 0) continue; 
    const r = Math.min(radius, len1 / 2, len2 / 2);
    const p1x = curr.x - (dx1 / len1) * r;
    const p1y = curr.y - (dy1 / len1) * r;
    const p2x = curr.x + (dx2 / len2) * r;
    const p2y = curr.y + (dy2 / len2) * r;
    path += ` L ${p1x},${p1y}`;
    path += ` Q ${curr.x},${curr.y} ${p2x},${p2y}`; 
  }
  const last = points[points.length - 1];
  path += ` L ${last.x},${last.y}`;
  return path;
}

export default function EditableEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data, markerStart, markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  
  // 🌟 Stale closure ကို ဖြေရှင်းဖို့ Ref သုံးပါမည်
  const pointsRef = useRef<Point[]>([]);

  const getTrueCenter = (x: number, y: number, position: Position) => {
    switch (position) {
      case Position.Left: return { x: x + HANDLE_RADIUS, y };
      case Position.Right: return { x: x - HANDLE_RADIUS, y };
      case Position.Top: return { x, y: y + HANDLE_RADIUS };
      case Position.Bottom: return { x, y: y - HANDLE_RADIUS };
      default: return { x, y };
    }
  };

  const trueSource = getTrueCenter(sourceX, sourceY, sourcePosition);
  const trueTarget = getTrueCenter(targetX, targetY, targetPosition);

  const getInitialPoints = useCallback((): Point[] => {
    const getOffset = (pos: Position, x: number, y: number) => {
      if (pos === Position.Top) return { x, y: y - STUB_LENGTH };
      if (pos === Position.Bottom) return { x, y: y + STUB_LENGTH };
      if (pos === Position.Left) return { x: x - STUB_LENGTH, y };
      return { x: x + STUB_LENGTH, y };
    };

    const p1 = { x: trueSource.x, y: trueSource.y };
    const p2 = getOffset(sourcePosition, trueSource.x, trueSource.y);
    const pTargetStub = getOffset(targetPosition, trueTarget.x, trueTarget.y);
    const pTarget = { x: trueTarget.x, y: trueTarget.y };

    const isSourceVertical = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
    const isTargetVertical = targetPosition === Position.Top || targetPosition === Position.Bottom;

    if (isSourceVertical !== isTargetVertical) {
      const midPoint = isSourceVertical ? { x: p2.x, y: pTargetStub.y } : { x: pTargetStub.x, y: p2.y };
      return [p1, p2, midPoint, pTargetStub, pTarget];
    } 

    if (isSourceVertical) {
      const midX = Math.round(((p2.x + pTargetStub.x) / 2) / GRID_SIZE) * GRID_SIZE;
      return [p1, p2, { x: midX, y: p2.y }, { x: midX, y: pTargetStub.y }, pTargetStub, pTarget];
    } else {
      const midY = Math.round(((p2.y + pTargetStub.y) / 2) / GRID_SIZE) * GRID_SIZE;
      return [p1, p2, { x: p2.x, y: midY }, { x: pTargetStub.x, y: midY }, pTargetStub, pTarget];
    }
  }, [trueSource.x, trueSource.y, trueTarget.x, trueTarget.y, sourcePosition, targetPosition]);

  const [points, setPoints] = useState<Point[]>(data?.points || getInitialPoints());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Synchronize points with ref
  useEffect(() => { pointsRef.current = points; }, [points]);

  useEffect(() => {
    setPoints((prev) => {
      if (!data?.points) return getInitialPoints();
      const newPts = [...prev];
      const len = newPts.length;

      newPts[0] = { x: trueSource.x, y: trueSource.y };
      newPts[len - 1] = { x: trueTarget.x, y: trueTarget.y };

      const updateStub = (pos: Position, x: number, y: number) => {
        if (pos === Position.Top) return { x, y: y - STUB_LENGTH };
        if (pos === Position.Bottom) return { x, y: y + STUB_LENGTH };
        if (pos === Position.Left) return { x: x - STUB_LENGTH, y };
        return { x: x + STUB_LENGTH, y };
      };

      newPts[1] = updateStub(sourcePosition, trueSource.x, trueSource.y);
      newPts[len - 2] = updateStub(targetPosition, trueTarget.x, trueTarget.y);

      if (len >= 4) {
        const isSVert = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
        if (isSVert) newPts[2].x = newPts[1].x; else newPts[2].y = newPts[1].y;
        const isTVert = targetPosition === Position.Top || targetPosition === Position.Bottom;
        if (isTVert) newPts[len - 3].x = newPts[len - 2].x; else newPts[len - 3].y = newPts[len - 2].y;
      }
      return newPts;
    });
  }, [trueSource.x, trueSource.y, trueTarget.x, trueTarget.y, sourcePosition, targetPosition, getInitialPoints, data?.points]);

  const onSegmentMouseDown = (e: React.MouseEvent, index: number, isVertical: boolean) => {
    e.stopPropagation();
   // (၁၉, ၆, ၂၀၂၆) if (index === 0 || index === points.length - 2) return;
    
    const startMouse = { x: e.clientX, y: e.clientY };
    const startPoints = [...pointsRef.current]; // Ref ကနေ လက်ရှိ Point တွေကို ယူမယ်
    let lastCalculatedPoints = startPoints;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startMouse.x) / zoom;
      const deltaY = (moveEvent.clientY - startMouse.y) / zoom;
      const newPts = startPoints.map((p) => ({ ...p }));

      if (isVertical) {
        const newX = Math.round((startPoints[index].x + deltaX) / GRID_SIZE) * GRID_SIZE;
        newPts[index].x = newX;
        newPts[index + 1].x = newX;
      } else {
        const newY = Math.round((startPoints[index].y + deltaY) / GRID_SIZE) * GRID_SIZE;
        newPts[index].y = newY;
        newPts[index + 1].y = newY;
      }
      lastCalculatedPoints = newPts;
      setPoints(newPts);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      // 🌟 ပြင်ထားတဲ့ Point အသစ်တွေကို Edge Data ထဲမှာ သိမ်းလိုက်မယ်
      setEdges((eds) => eds.map((edge) => 
        edge.id === id ? { ...edge, data: { ...edge.data, points: lastCalculatedPoints } } : edge
      ));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onSegmentDoubleClick = (e: React.MouseEvent, index: number, isVertical: boolean) => {
    e.stopPropagation();
    if (index === 0 || index === points.length - 2) return; 
    const newPts = [...points];
    const p1 = newPts[index];
    const p2 = newPts[index + 1];
    if (!isVertical) {
      const midX = (p1.x + p2.x) / 2;
      const dirX = Math.sign(p2.x - p1.x) || 1;
      const offset = 15; 
      newPts.splice(index + 1, 0, 
        { x: midX - dirX * offset, y: p1.y },
        { x: midX - dirX * offset, y: p1.y + 20 }, 
        { x: midX + dirX * offset, y: p1.y + 20 },
        { x: midX + dirX * offset, y: p1.y }
      );
    } else {
      const midY = (p1.y + p2.y) / 2;
      const dirY = Math.sign(p2.y - p1.y) || 1;
      const offset = 15;
      newPts.splice(index + 1, 0, 
        { x: p1.x, y: midY - dirY * offset },
        { x: p1.x + 20, y: midY - dirY * offset }, 
        { x: p1.x + 20, y: midY + dirY * offset },
        { x: p1.x, y: midY + dirY * offset }
      );
    }
    setPoints(newPts);
    setEdges((eds) => eds.map((edge) => edge.id === id ? { ...edge, data: { ...edge.data, points: newPts } } : edge));
  };

  const edgePath = createRoundedPath(points, CORNER_RADIUS);
  const segments = points.slice(0, -1).map((p1, i) => {
    const p2 = points[i + 1];
    return { p1, p2, isVertical: Math.abs(p1.x - p2.x) < 0.1, isDraggable: true}; //i !== 0 && i !== points.length - 2
  });
  const wireColor = style.stroke || '#ff0000';

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={{ stroke: style.stroke || '#0a1161', strokeWidth: 6, ...style }} />
      {segments.map((seg, index) => (
        <path
          key={index}
          d={`M ${seg.p1.x},${seg.p1.y} L ${seg.p2.x},${seg.p2.y}`}
          fill="none"
          stroke={hoveredIndex === index ? "rgba(100,149,237,0.3)" : "transparent"}
          strokeWidth={seg.isDraggable ? 20 : 0} 
          style={{ cursor: !seg.isDraggable ? 'default' : seg.isVertical ? 'col-resize' : 'row-resize' }}
          onMouseEnter={() => seg.isDraggable && setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseDown={(e) => seg.isDraggable && onSegmentMouseDown(e, index, seg.isVertical)}
          onDoubleClick={(e) => seg.isDraggable && onSegmentDoubleClick(e, index, seg.isVertical)} 
        />
      ))}
     <EdgeLabelRenderer>
        {/* Source Dot (အစ) - True Center ကို အသုံးပြုထားသည် */}
         <div
          style={{
            position: 'absolute',
            left: 0, top: 0,
            transform: `translate(${trueSource.x}px, ${trueSource.y}px) translate(-50%, -50%)`,
            width: '6px',
            height: '6px',
            background: wireColor,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
        />
         {/* Target Dot (အဆုံး) - True Center ကို အသုံးပြုထားသည် */}
         <div
          style={{
            position: 'absolute',
            left: 0, top: 0,
            transform: `translate(${trueTarget.x}px, ${trueTarget.y}px) translate(-50%, -50%)`,
            width: '6px',
            height: '6px',
            background: wireColor,
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1001,
          }}
        />
      </EdgeLabelRenderer> 
    </>
  );
}

// import React, { useState, useEffect, useCallback } from 'react';
// import { type EdgeProps, BaseEdge, EdgeLabelRenderer, Position, useReactFlow, useStore } from 'reactflow';

// type Point = { x: number; y: number };

// const GRID_SIZE = 10.5; 
// const CORNER_RADIUS = 8; 
// const STUB_LENGTH = 15; 
// const HANDLE_RADIUS = 2.8; // 🌟 6px Pin ရဲ့ အလယ်ဗဟိုကို ရောက်ရန် 3px အသုံးပြုပါမည်

// function createRoundedPath(points: Point[], radius: number) {
//   if (points.length < 2) return '';
//   let path = `M ${points[0].x},${points[0].y}`;

//   for (let i = 1; i < points.length - 1; i++) {
//     const prev = points[i - 1];
//     const curr = points[i];
//     const next = points[i + 1];

//     const dx1 = curr.x - prev.x;
//     const dy1 = curr.y - prev.y;
//     const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

//     const dx2 = next.x - curr.x;
//     const dy2 = next.y - curr.y;
//     const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

//     if (len1 === 0 || len2 === 0) continue; 

//     const r = Math.min(radius, len1 / 2, len2 / 2);

//     const p1x = curr.x - (dx1 / len1) * r;
//     const p1y = curr.y - (dy1 / len1) * r;
//     const p2x = curr.x + (dx2 / len2) * r;
//     const p2y = curr.y + (dy2 / len2) * r;

//     path += ` L ${p1x},${p1y}`;
//     path += ` Q ${curr.x},${curr.y} ${p2x},${p2y}`; 
//   }

//   const last = points[points.length - 1];
//   path += ` L ${last.x},${last.y}`;
//   return path;
// }

// export default function EditableEdge({
//   id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data, markerStart, markerEnd,
// }: EdgeProps) {
//   const { setEdges } = useReactFlow();
//   const zoom = useStore((s) => s.transform[2]);

//   // 🌟 အစွန်းကနေ အလယ်ဗဟိုသို့ ပြန်တွက်ပေးသော Function
//   const getTrueCenter = (x: number, y: number, position: Position) => {
//     switch (position) {
//       case Position.Left: return { x: x + HANDLE_RADIUS, y };
//       case Position.Right: return { x: x - HANDLE_RADIUS, y };
//       case Position.Top: return { x, y: y + HANDLE_RADIUS };
//       case Position.Bottom: return { x, y: y - HANDLE_RADIUS };
//       default: return { x, y };
//     }
//   };

//   const trueSource = getTrueCenter(sourceX, sourceY, sourcePosition);
//   const trueTarget = getTrueCenter(targetX, targetY, targetPosition);

//   const getInitialPoints = useCallback((): Point[] => {
//     const getOffset = (pos: Position, x: number, y: number) => {
//       switch (pos) {
//         case Position.Top: return { x, y: y - STUB_LENGTH };
//         case Position.Bottom: return { x, y: y + STUB_LENGTH };
//         case Position.Left: return { x: x - STUB_LENGTH, y };
//         case Position.Right: return { x: x + STUB_LENGTH, y };
//         default: return { x, y };
//       }
//     };
//     // 🌟 တွက်ချက်ထားသော True Center ကို အသုံးပြုခြင်း
//     const p1 = { x: trueSource.x, y: trueSource.y };
//     const p2 = getOffset(sourcePosition, trueSource.x, trueSource.y);
//     const p6 = { x: trueTarget.x, y: trueTarget.y };
//     const p5 = getOffset(targetPosition, trueTarget.x, trueTarget.y);

//     // 🌟 Logic ခွဲခြားခြင်း
//   if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
//     // Horizontal Pin အတွက်: ပထမဆုံးချိုးမည့်လိုင်းကို Vertical ဖြစ်အောင် midY ရှာပြီး x ကို Grid ကပ်မည်
//     const midY = Math.round(((p2.y + p5.y) / 2) / GRID_SIZE) * GRID_SIZE;
//     return [p1, p2, { x: p2.x, y: midY }, { x: p5.x, y: midY }, p5, p6];
//   } else {
//     // Vertical Pin အတွက်: ပထမဆုံးချိုးမည့်လိုင်းကို Horizontal ဖြစ်အောင် midX ရှာပြီး y ကို Grid ကပ်မည်
//     const midX = Math.round(((p2.x + p5.x) / 2) / GRID_SIZE) * GRID_SIZE;
//     return [p1, p2, { x: midX, y: p2.y }, { x: midX, y: p5.y }, p5, p6];
//   }
// }, [trueSource.x, trueSource.y, trueTarget.x, trueTarget.y, sourcePosition, targetPosition]);

//   const [points, setPoints] = useState<Point[]>(data?.points || getInitialPoints());
//   const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

//   useEffect(() => {
//     setPoints((prev) => {
//       if (!data?.points) return getInitialPoints();
//       const newPts = [...prev];
//       // 🌟 Component ရွှေ့ရင်လည်း True Center ကိုပဲ ဖမ်းထားမည်
//       newPts[0] = { x: trueSource.x, y: trueSource.y };
//       newPts[newPts.length - 1] = { x: trueTarget.x, y: trueTarget.y };

//       if (sourcePosition === Position.Top || sourcePosition === Position.Bottom) newPts[1].x = trueSource.x;
//       else newPts[1].y = trueSource.y;
      
//       if (targetPosition === Position.Top || targetPosition === Position.Bottom) newPts[newPts.length - 2].x = trueTarget.x;
//       else newPts[newPts.length - 2].y = trueTarget.y;

//       return newPts;
//     });
//   }, [trueSource.x, trueSource.y, trueTarget.x, trueTarget.y, sourcePosition, targetPosition, getInitialPoints, data?.points]);

//   const onSegmentDoubleClick = (e: React.MouseEvent, index: number, isVertical: boolean) => {
//     e.stopPropagation();
//     if (index === 0 || index === points.length - 2) return; 

//     const newPts = [...points];
//     const p1 = newPts[index];
//     const p2 = newPts[index + 1];

//     if (!isVertical) {
//       const midX = (p1.x + p2.x) / 2;
//       const dirX = Math.sign(p2.x - p1.x) || 1;
//       const offset = Math.min(15, Math.abs(p2.x - p1.x) / 4); 
      
//       newPts.splice(index + 1, 0, 
//         { x: midX - dirX * offset, y: p1.y },
//         { x: midX - dirX * offset, y: p1.y + 20 }, 
//         { x: midX + dirX * offset, y: p1.y + 20 },
//         { x: midX + dirX * offset, y: p1.y }
//       );
//     } else {
//       const midY = (p1.y + p2.y) / 2;
//       const dirY = Math.sign(p2.y - p1.y) || 1;
//       const offset = Math.min(15, Math.abs(p2.y - p1.y) / 4);
      
//       newPts.splice(index + 1, 0, 
//         { x: p1.x, y: midY - dirY * offset },
//         { x: p1.x + 20, y: midY - dirY * offset }, 
//         { x: p1.x + 20, y: midY + dirY * offset },
//         { x: p1.x, y: midY + dirY * offset }
//       );
//     }

//     setPoints(newPts);
//     setEdges((eds) => eds.map((edge) => edge.id === id ? { ...edge, data: { ...edge.data, points: newPts } } : edge));
//   };

//   const onSegmentMouseDown = (e: React.MouseEvent, index: number, isVertical: boolean) => {
//     e.stopPropagation();
//     if (index === 0 || index === points.length - 2) return;
//     const startMouse = { x: e.clientX, y: e.clientY };
//     const startPoints = points.map((p) => ({ ...p }));

//     const onMouseMove = (moveEvent: MouseEvent) => {
//       const deltaX = (moveEvent.clientX - startMouse.x) / zoom;
//       const deltaY = (moveEvent.clientY - startMouse.y) / zoom;
//       const newPts = startPoints.map((p) => ({ ...p }));

//       if (isVertical) {
//         const newX = Math.round((startPoints[index].x + deltaX) / GRID_SIZE) * GRID_SIZE;
//         newPts[index].x = newX;
//         newPts[index + 1].x = newX;
//       } else {
//         const newY = Math.round((startPoints[index].y + deltaY) / GRID_SIZE) * GRID_SIZE;
//         newPts[index].y = newY;
//         newPts[index + 1].y = newY;
//       }
//       setPoints(newPts);
//     };

//     const onMouseUp = () => {
//       window.removeEventListener('mousemove', onMouseMove);
//       window.removeEventListener('mouseup', onMouseUp);
//       setEdges((eds) => eds.map((edge) => edge.id === id ? { ...edge, data: { ...edge.data, points } } : edge));
//     };

//     window.addEventListener('mousemove', onMouseMove);
//     window.addEventListener('mouseup', onMouseUp);
//   };

//   const edgePath = createRoundedPath(points, CORNER_RADIUS);

//   const segments = [];
//   for (let i = 0; i < points.length - 1; i++) {
//     const p1 = points[i];
//     const p2 = points[i + 1];
//     const isVertical = Math.abs(p1.x - p2.x) < 1;
//     const isDraggable = i !== 0 && i !== points.length - 2; 
//     segments.push({ p1, p2, isVertical, isDraggable, d: `M ${p1.x},${p1.y} L ${p2.x},${p2.y}` });
//   }
//   const wireColor = style.stroke || '#ff0000';

//   return (
//     <>
//       <BaseEdge 
//         path={edgePath} 
//         markerEnd={markerEnd} 
//         markerStart={markerStart}
//         style={{ stroke: style.stroke || '#0a1161', strokeWidth: 6, ...style, zIndex: 100 }} 
//       />

//       {segments.map((seg, index) => (
//         <path
//           key={index}
//           d={seg.d}
//           fill="none"
//           stroke={hoveredIndex === index ? "rgba(100,149,237,0.3)" : "transparent"}
//           strokeWidth={seg.isDraggable ? 20 : 0} 
//           style={{ cursor: !seg.isDraggable ? 'default' : seg.isVertical ? 'col-resize' : 'row-resize', transition: 'stroke 0.2s', zIndex: 100 }}
//           onMouseEnter={() => seg.isDraggable && setHoveredIndex(index)}
//           onMouseLeave={() => setHoveredIndex(null)}
//           onMouseDown={(e) => seg.isDraggable && onSegmentMouseDown(e, index, seg.isVertical)}
//           onDoubleClick={(e) => seg.isDraggable && onSegmentDoubleClick(e, index, seg.isVertical)} 
//         />
//       ))}
      
//       <EdgeLabelRenderer>
//         {/* Source Dot (အစ) - True Center ကို အသုံးပြုထားသည် */}
//         <div
//           style={{
//             position: 'absolute',
//             left: 0, top: 0,
//             transform: `translate(${trueSource.x}px, ${trueSource.y}px) translate(-50%, -50%)`,
//             width: '6px',
//             height: '6px',
//             background: wireColor,
//             borderRadius: '50%',
//             pointerEvents: 'none',
//             zIndex: 1001,
//           }}
//         />
//         {/* Target Dot (အဆုံး) - True Center ကို အသုံးပြုထားသည် */}
//         <div
//           style={{
//             position: 'absolute',
//             left: 0, top: 0,
//             transform: `translate(${trueTarget.x}px, ${trueTarget.y}px) translate(-50%, -50%)`,
//             width: '6px',
//             height: '6px',
//             background: wireColor,
//             borderRadius: '50%',
//             pointerEvents: 'none',
//             zIndex: 1001,
//           }}
//         />
//       </EdgeLabelRenderer>

//       {hoveredIndex !== null && (
//         <EdgeLabelRenderer>
//           <div
//             style={{
//               position: 'absolute',
//               left: (segments[hoveredIndex].p1.x + segments[hoveredIndex].p2.x) / 2,
//               top: (segments[hoveredIndex].p1.y + segments[hoveredIndex].p2.y) / 2 - 15,
//               transform: 'translate(-50%, -100%)',
//               pointerEvents: 'none',
//               background: '#333',
//               color: '#fff',
//               padding: '2px 6px',
//               borderRadius: '4px',
//               fontSize: '10px'
//             }}
//             className="z-50 shadow-md"
//           >
//             Double-click to split
//           </div>
//         </EdgeLabelRenderer>
//       )}
//     </>
//   );
// }