import React, {
  useEffect,
  useMemo,
} from "react";

import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from "reactflow";

// =====================================================
// TYPES
// =====================================================

type BreadboardPinType = "terminal";

type BreadboardPin = {
  id: string;
  label: string;
  type: BreadboardPinType;
  direction: "bidirectional" | "passive";
  description?: string;
  group?: string;
  row?: number;
  column?: string;
  x: number;
  y: number;
  handleId: string;
};

// =====================================================
// CONSTANTS (MINI BREADBOARD - 17 ROWS)
// =====================================================

const SCALE = 0.5;
const ROW_COUNT = 17;

const leftCols = [
  { label: "A", x: 30 },
  { label: "B", x: 50 },
  { label: "C", x: 70 },
  { label: "D", x: 90 },
  { label: "E", x: 110 },
];

const rightCols = [
  { label: "F", x: 170 },
  { label: "G", x: 190 },
  { label: "H", x: 210 },
  { label: "I", x: 230 },
  { label: "J", x: 250 },
];

// =====================================================
// ROW POSITION
// =====================================================

const getRowY = (row: number) => {
  return 35 + row * 20;
};

// =====================================================
// BREADBOARD PIN BUILDER
// =====================================================

function createMiniBreadboardPins(): BreadboardPin[] {
  const pins: BreadboardPin[] = [];

  for (let row = 1; row <= ROW_COUNT; row++) {
    const y = getRowY(row);

    // -----------------------------------------------
    // LEFT A-E
    // -----------------------------------------------
    leftCols.forEach((column) => {
      const pinId = `${column.label}${row}`;

      pins.push({
        id: pinId,
        label: pinId,
        type: "terminal",
        direction: "bidirectional",
        description: `Mini breadboard terminal ${pinId}`,
        group: `row-${row}-left`,
        row,
        column: column.label,
        x: column.x,
        y,
        handleId: `pin_${pinId}`,
      });
    });

    // -----------------------------------------------
    // RIGHT F-J
    // -----------------------------------------------
    rightCols.forEach((column) => {
      const pinId = `${column.label}${row}`;

      pins.push({
        id: pinId,
        label: pinId,
        type: "terminal",
        direction: "bidirectional",
        description: `Mini breadboard terminal ${pinId}`,
        group: `row-${row}-right`,
        row,
        column: column.label,
        x: column.x,
        y,
        handleId: `pin_${pinId}`,
      });
    });
  }

  return pins;
}

// =====================================================
// COMPONENT
// =====================================================

const BreadboardMiniNode = ({ id, data }: NodeProps) => {
  const rotation = typeof data?.rotation === "number" ? data.rotation : 0;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      updateNodeInternals(id);
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [id, rotation, updateNodeInternals]);

  const pins = useMemo(() => createMiniBreadboardPins(), []);

  // MINI BOARD SIZE
  const nodeWidth = 280 * SCALE;
  const nodeHeight = 410 * SCALE;

  return (
    <div
      className="
        relative
        bg-transparent
        border-2
        border-transparent
        hover:border-blue-400/60
      "
      style={{
        width: `${nodeWidth}px`,
        height: `${nodeHeight}px`,
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* =================================================
          SVG BREADBOARD
      ================================================= */}
      <svg
        viewBox="0 0 280 410"
        width={nodeWidth}
        height={nodeHeight}
        className="
          absolute
          z-5
          top-0
          left-0
          pointer-events-none
        "
      >
        <defs>
          <g id="wokwi-3d-hole">
            <rect
              x="0"
              y="0"
              width="11"
              height="11"
              rx="1"
              fill="#FFFFFF"
              opacity="0.9"
            />
            <rect
              x="-1"
              y="-1"
              width="11"
              height="11"
              rx="1"
              fill="#A0A0A0"
              opacity="0.5"
            />
            <rect
              x="0"
              y="0"
              width="10"
              height="10"
              rx="1"
              fill="#242424"
            />
            <rect x="0" y="0" width="9" height="2" fill="#121212" />
            <rect x="0" y="0" width="2" height="9" fill="#121212" />
          </g>
        </defs>

        {/* BOARD BASE */}
        <rect
          x="0"
          y="0"
          width="280"
          height="410"
          rx="12"
          fill="#E5E7EB"
          stroke="#D1D5DB"
          strokeWidth="2"
        />

        {/* CENTER TRENCH */}
        <rect
          x="132"
          y="40"
          width="16"
          height="350"
          rx="2"
          fill="#CDD1D6"
        />

        {/* =============================================
            COLUMN LABELS (A-E & F-J)
        ============================================= */}
        {leftCols.map((column) => (
          <text
            key={`col-label-${column.label}`}
            x={column.x}
            y="28"
            fontFamily="Arial"
            fontSize="12"
            fontWeight="bold"
            fill="#4B5563"
            textAnchor="middle"
          >
            {column.label}
          </text>
        ))}

        {rightCols.map((column) => (
          <text
            key={`col-label-${column.label}`}
            x={column.x}
            y="28"
            fontFamily="Arial"
            fontSize="12"
            fontWeight="bold"
            fill="#4B5563"
            textAnchor="middle"
          >
            {column.label}
          </text>
        ))}

        {/* =============================================
            ROWS + HOLES
        ============================================= */}
        {Array.from({ length: ROW_COUNT }, (_, index) => index + 1).map((row) => {
          const y = getRowY(row);

          return (
            <g key={`row-group-${row}`}>
              {/* LEFT NUMBER */}
              <text
                x="12"
                y={y + 4}
                fontFamily="Arial"
                fontSize="9"
                fontWeight="bold"
                fill="#6B7280"
                textAnchor="middle"
              >
                {row}
              </text>

              {/* RIGHT NUMBER */}
              <text
                x="268"
                y={y + 4}
                fontFamily="Arial"
                fontSize="9"
                fontWeight="bold"
                fill="#6B7280"
                textAnchor="middle"
              >
                {row}
              </text>

              {/* A-E HOLES */}
              {leftCols.map((column) => (
                <use
                  key={`${column.label}-${row}`}
                  href="#wokwi-3d-hole"
                  x={column.x - 5}
                  y={y - 5}
                />
              ))}

              {/* F-J HOLES */}
              {rightCols.map((column) => (
                <use
                  key={`${column.label}-${row}`}
                  href="#wokwi-3d-hole"
                  x={column.x - 5}
                  y={y - 5}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {/* =================================================
          REACT FLOW HANDLES
      ================================================= */}
      {pins.map((pin) => (
        <Handle
          key={pin.id}
          id={pin.handleId}
          type="source"
          position={Position.Top}
          title={pin.label}
          style={{
            left: `${pin.x * SCALE}px`,
            top: `${pin.y * SCALE}px`,
            width: `${10 * SCALE}px`,
            height: `${10 * SCALE}px`,
            transform: `translate(${-5 * SCALE}px, ${-5 * SCALE}px)`,
            background: "transparent",
            border: "none",
            minWidth: 0,
            minHeight: 0,
            cursor: "crosshair",
            zIndex: 10,
          }}
          data-pin-id={pin.id}
          data-pin-name={pin.label}
          data-pin-type={pin.type}
          data-row={pin.row}
          data-column={pin.column}
          data-group={pin.group}
        />
      ))}
    </div>
  );
};

export default BreadboardMiniNode;