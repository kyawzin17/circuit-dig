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

type BreadboardPinType =
  | "terminal"
  | "power"
  | "ground";

type BreadboardPin = {
  id: string;
  label: string;

  type: BreadboardPinType;

  direction: "bidirectional" | "passive";

  description?: string;

  group?: string;

  row?: number;

  column?: string;

  rail?: "vcc" | "gnd";

  x: number;

  y: number;

  handleId: string;
};


// =====================================================
// CONSTANTS (FULL BREADBOARD - 63 ROWS)
// =====================================================

const SCALE = 0.5;

const ROW_COUNT = 63;

const leftCols = [
  { label: "A", x: 90 },
  { label: "B", x: 110 },
  { label: "C", x: 130 },
  { label: "D", x: 150 },
  { label: "E", x: 170 },
];

const rightCols = [
  { label: "F", x: 270 },
  { label: "G", x: 290 },
  { label: "H", x: 310 },
  { label: "I", x: 330 },
  { label: "J", x: 350 },
];

const powerCols = [
  {
    id: "gnd-l",
    x: 30,
    type: "gnd" as const,
    label: "GND-L",
  },
  {
    id: "vcc-l",
    x: 50,
    type: "vcc" as const,
    label: "VCC-L",
  },
  {
    id: "vcc-r",
    x: 390,
    type: "vcc" as const,
    label: "VCC-R",
  },
  {
    id: "gnd-r",
    x: 410,
    type: "gnd" as const,
    label: "GND-R",
  },
];


// =====================================================
// ROW POSITION
// =====================================================

const getRowY = (row: number) => {
  return 30 + row * 20;
};


// =====================================================
// BREADBOARD PIN BUILDER
// =====================================================

function createBreadboardPins(): BreadboardPin[] {

  const pins: BreadboardPin[] = [];


  // ===================================================
  // MAIN TERMINAL HOLES
  // ===================================================

  for (
    let row = 1;
    row <= ROW_COUNT;
    row++
  ) {

    const y = getRowY(row);


    // -----------------------------------------------
    // LEFT A-E
    // -----------------------------------------------

    leftCols.forEach((column) => {

      const pinId =
        `${column.label}${row}`;

      pins.push({

        id: pinId,

        label: pinId,

        type: "terminal",

        direction: "bidirectional",

        description:
          `Full breadboard terminal ${pinId}`,

        group:
          `row-${row}-left`,

        row,

        column:
          column.label,

        x: column.x,

        y,

        handleId:
          `pin_${pinId}`,

      });

    });


    // -----------------------------------------------
    // RIGHT F-J
    // -----------------------------------------------

    rightCols.forEach((column) => {

      const pinId =
        `${column.label}${row}`;

      pins.push({

        id: pinId,

        label: pinId,

        type: "terminal",

        direction: "bidirectional",

        description:
          `Full breadboard terminal ${pinId}`,

        group:
          `row-${row}-right`,

        row,

        column:
          column.label,

        x: column.x,

        y,

        handleId:
          `pin_${pinId}`,

      });

    });


    // =================================================
    // POWER RAILS
    // =================================================

    powerCols.forEach((power) => {

      const pinId =
        `${power.label}_${row}`;

      const isGround =
        power.type === "gnd";

      pins.push({

        id: pinId,

        label: pinId,

        type:
          isGround
            ? "ground"
            : "power",

        direction:
          "bidirectional",

        description:
          isGround
            ? `Ground rail ${power.label} row ${row}`
            : `Power rail ${power.label} row ${row}`,

        group:
          `${power.type}-rail`,

        row,

        rail:
          isGround
            ? "gnd"
            : "vcc",

        x: power.x,

        y,

        handleId:
          `${power.type}_${power.id}_${row}`,

      });

    });

  }


  return pins;
}


// =====================================================
// COMPONENT
// =====================================================

const BreadboardFullNode = ({
  id,
  data,
}: NodeProps) => {


  // ===================================================
  // ROTATION
  // ===================================================

  const rotation =
    typeof data?.rotation === "number"
      ? data.rotation
      : 0;


  // ===================================================
  // REACT FLOW INTERNALS
  // ===================================================

  const updateNodeInternals =
    useUpdateNodeInternals();


  useEffect(() => {

    const timer =
      window.setTimeout(() => {

        updateNodeInternals(id);

      }, 100);

    return () => {

      window.clearTimeout(timer);

    };

  }, [
    id,
    rotation,
    updateNodeInternals,
  ]);


  // ===================================================
  // CREATE PINS
  // ===================================================

  const pins =
    useMemo(
      () => createBreadboardPins(),
      []
    );


  // ===================================================
  // BOARD SIZE (63 ROWS)
  // ===================================================

  const nodeWidth =
    440 * SCALE;

  const nodeHeight =
    1340 * SCALE;


  // ===================================================
  // RENDER
  // ===================================================

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

        width:
          `${nodeWidth}px`,

        height:
          `${nodeHeight}px`,

        transform:
          `rotate(${rotation}deg)`,

        transition:
          "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",

      }}

    >

      {/* =================================================
          SVG BREADBOARD
      ================================================= */}

      <svg

        viewBox="0 0 440 1340"

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

            <rect
              x="0"
              y="0"
              width="9"
              height="2"
              fill="#121212"
            />

            <rect
              x="0"
              y="0"
              width="2"
              height="9"
              fill="#121212"
            />

          </g>

        </defs>


        {/* =============================================
            BOARD BASE
        ============================================= */}

        <rect

          x="0"
          y="0"
          width="440"
          height="1340"
          rx="12"

          fill="#E5E7EB"

          stroke="#D1D5DB"

          strokeWidth="2"

        />


        {/* =============================================
            CENTER TRENCH
        ============================================= */}

        <rect

          x="212"
          y="40"

          width="16"
          height="1260"

          rx="2"

          fill="#CDD1D6"

        />


        {/* =============================================
            POWER RAILS
        ============================================= */}

        <line

          x1="20"
          y1="45"
          x2="20"
          y2="1295"

          stroke="#3498DB"

          strokeWidth="2"

          strokeLinecap="round"

        />

        <line

          x1="65"
          y1="45"
          x2="65"
          y2="1295"

          stroke="#E74C3C"

          strokeWidth="2"

          strokeLinecap="round"

        />

        <line

          x1="375"
          y1="45"
          x2="375"
          y2="1295"

          stroke="#E74C3C"

          strokeWidth="2"

          strokeLinecap="round"

        />

        <line

          x1="420"
          y1="45"
          x2="420"
          y2="1295"

          stroke="#3498DB"

          strokeWidth="2"

          strokeLinecap="round"

        />


        {/* =============================================
            COLUMN LABELS (A-E & F-J)
        ============================================= */}

        {leftCols.map((column) => (

          <text

            key={`col-top-${column.label}`}

            x={column.x}

            y="32"

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

            key={`col-top-${column.label}`}

            x={column.x}

            y="32"

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

        {Array.from(
          { length: ROW_COUNT },
          (_, index) => index + 1
        ).map((row) => {

          const y =
            getRowY(row);


          return (

            <g
              key={`row-group-${row}`}
            >

              {/* LEFT NUMBER */}

              <text

                x="198"

                y={y + 8}

                fontFamily="Arial"

                fontSize="10"

                fontWeight="bold"

                fill="#6B7280"

                textAnchor="middle"

              >
                {row}
              </text>


              {/* RIGHT NUMBER */}

              <text

                x="242"

                y={y + 8}

                fontFamily="Arial"

                fontSize="10"

                fontWeight="bold"

                fill="#6B7280"

                textAnchor="middle"

              >
                {row}
              </text>


              {/* POWER HOLES */}

              {powerCols.map((power) => (

                <use

                  key={
                    `${power.id}-${row}`
                  }

                  href="#wokwi-3d-hole"

                  x={power.x - 5}

                  y={y - 5}

                />

              ))}


              {/* A-E */}

              {leftCols.map((column) => (

                <use

                  key={
                    `${column.label}-${row}`
                  }

                  href="#wokwi-3d-hole"

                  x={column.x - 5}

                  y={y - 5}

                />

              ))}


              {/* F-J */}

              {rightCols.map((column) => (

                <use

                  key={
                    `${column.label}-${row}`
                  }

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

            left:
              `${pin.x * SCALE}px`,

            top:
              `${pin.y * SCALE}px`,

            width:
              `${10 * SCALE}px`,

            height:
              `${10 * SCALE}px`,

            transform:
              `translate(${-5 * SCALE}px, ${-5 * SCALE}px)`,

            background:
              "transparent",

            border:
              "none",

            minWidth: 0,

            minHeight: 0,

            cursor:
              "crosshair",

            zIndex: 10,

          }}

          data-pin-id={
            pin.id
          }

          data-pin-name={
            pin.label
          }

          data-pin-type={
            pin.type
          }

          data-row={
            pin.row
          }

          data-column={
            pin.column
          }

          data-group={
            pin.group
          }

          data-rail={
            pin.rail
          }

        />

      ))}

    </div>

  );
};


// =====================================================
// EXPORT
// =====================================================

export default BreadboardFullNode;