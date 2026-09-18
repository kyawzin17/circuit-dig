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

  direction:
    | "bidirectional"
    | "passive";

  description?: string;
  group?: string;

  row: number;
  column: string;

  x: number;
  y: number;

  handleId: string;
};

// =====================================================
// CONSTANTS
// =====================================================

const SCALE = 0.5;

const ROW_COUNT = 17;

// =====================================================
// COLUMNS
// =====================================================

const leftCols = [
  {
    label: "A",
    x: 30,
  },
  {
    label: "B",
    x: 50,
  },
  {
    label: "C",
    x: 70,
  },
  {
    label: "D",
    x: 90,
  },
  {
    label: "E",
    x: 110,
  },
];

const rightCols = [
  {
    label: "F",
    x: 170,
  },
  {
    label: "G",
    x: 190,
  },
  {
    label: "H",
    x: 210,
  },
  {
    label: "I",
    x: 230,
  },
  {
    label: "J",
    x: 250,
  },
];

// =====================================================
// ROW POSITION
// =====================================================

const getRowY = (
  row: number
) => {
  return 30 + row * 20;
};

// =====================================================
// CREATE BREADBOARD PINS
// =====================================================

function createMiniBreadboardPins(): BreadboardPin[] {
  const pins: BreadboardPin[] = [];

  // ===================================================
  // ROWS
  // ===================================================

  for (
    let row = 1;
    row <= ROW_COUNT;
    row++
  ) {
    const y = getRowY(row);

    // =================================================
    // LEFT A-E
    // =================================================

    leftCols.forEach(
      (column) => {
        const pinId =
          `${column.label}${row}`;

        pins.push({
          id: pinId,

          label: pinId,

          type: "terminal",

          direction: "bidirectional",

          description:
            `Mini breadboard terminal ${pinId}`,

          group:
            `row-${row}-left`,

          row,

          column:
            column.label,

          x:
            column.x,

          y,

          handleId:
            `pin_${pinId}`,
        });
      }
    );

    // =================================================
    // RIGHT F-J
    // =================================================

    rightCols.forEach(
      (column) => {
        const pinId =
          `${column.label}${row}`;

        pins.push({
          id: pinId,

          label: pinId,

          type: "terminal",

          direction: "bidirectional",

          description:
            `Mini breadboard terminal ${pinId}`,

          group:
            `row-${row}-right`,

          row,

          column:
            column.label,

          x:
            column.x,

          y,

          handleId:
            pinId,
        });
      }
    );
  }

  return pins;
}

// =====================================================
// COMPONENT
// =====================================================

const BreadboardMiniNode = ({
  id,
  data,
}: NodeProps) => {

  // ===================================================
  // ROTATION
  // ===================================================

  /*
   * IMPORTANT:
   *
   * Don't use:
   *
   *   data.rotation || 0
   *
   * because explicit 0 is better handled
   * as a number.
   */

  const rotation =
    typeof data?.rotation === "number"
      ? data.rotation
      : 0;

  // ===================================================
  // REACT FLOW INTERNAL
  // ===================================================

  const updateNodeInternals =
    useUpdateNodeInternals();

  // ===================================================
  // PINS
  // ===================================================

  const pins = useMemo(
    () =>
      createMiniBreadboardPins(),
    []
  );

  // ===================================================
  // UPDATE REACT FLOW HANDLE POSITIONS
  // ===================================================

  useEffect(() => {

    /*
     * Board rotation changes the visual
     * coordinate system.
     *
     * React Flow needs to recalculate
     * the handle positions after the
     * CSS transform has been applied.
     */

    const timer =
      window.setTimeout(() => {

        updateNodeInternals(id);

      }, 300);

    return () => {

      window.clearTimeout(timer);

    };

  }, [
    rotation,
    updateNodeInternals,
    id,
  ]);

  // ===================================================
  // BOARD SIZE
  // ===================================================

  // MINI BOARD SIZE
  const nodeWidth = 280 * SCALE;
  const nodeHeight = 410 * SCALE;
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
        {/* =================================================
            SVG DEFINITIONS
        ================================================= */}

        <defs>

          <g id="wokwi-3d-hole">

            {/* WHITE EDGE */}

            <rect
              x="0"
              y="0"
              width="11"
              height="11"
              rx="1"
              fill="#FFFFFF"
              opacity="0.9"
            />

            {/* GREY SHADOW */}

            <rect
              x="-1"
              y="-1"
              width="11"
              height="11"
              rx="1"
              fill="#A0A0A0"
              opacity="0.5"
            />

            {/* BLACK HOLE */}

            <rect
              x="0"
              y="0"
              width="10"
              height="10"
              rx="1"
              fill="#242424"
            />

            {/* TOP SHADOW */}

            <rect
              x="0"
              y="0"
              width="9"
              height="2"
              fill="#121212"
            />

            {/* LEFT SHADOW */}

            <rect
              x="0"
              y="0"
              width="2"
              height="9"
              fill="#121212"
            />

          </g>

        </defs><defs>
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

        {/* =================================================
            BOARD BASE PANEL
        ================================================= */}

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

        {/* =================================================
            ROWS + HOLES
        ================================================= */}

        {Array.from(
          {
            length: ROW_COUNT,
          },
          (_, index) =>
            index + 1
        ).map(
          (row) => {

            const y =
              getRowY(row);

            return (

              <g
                key={
                  `row-group-${row}`
                }
              >

                {/* =======================================
                    LEFT ROW NUMBER
                ======================================= */}

                <text

                  x="10"

                  y={
                    y + 8
                  }

                  fontFamily="Arial"

                  fontSize="10"

                  fontWeight="bold"

                  fill="#6B7280"

                  textAnchor="middle"
                >
                  {row}
                </text>

                {/* =======================================
                    RIGHT ROW NUMBER
                ======================================= */}

                <text

                  x="270"

                  y={
                    y + 8
                  }

                  fontFamily="Arial"

                  fontSize="10"

                  fontWeight="bold"

                  fill="#6B7280"

                  textAnchor="middle"
                >
                  {row}
                </text>

                {/* =======================================
                    A-E HOLES
                ======================================= */}

                {leftCols.map(
                  (column) => (

                    <use

                      key={
                        `col-${column.label}-${row}`
                      }

                      href="#wokwi-3d-hole"

                      x={
                        column.x - 5
                      }

                      y={
                        y - 5
                      }
                    />

                  )
                )}

                {/* =======================================
                    F-J HOLES
                ======================================= */}

                {rightCols.map(
                  (column) => (

                    <use

                      key={
                        `col-${column.label}-${row}`
                      }

                      href="#wokwi-3d-hole"

                      x={
                        column.x - 5
                      }

                      y={
                        y - 5
                      }
                    />

                  )
                )}

              </g>

            );
          }
        )}

      </svg>

      {/* =================================================
          2. REACT FLOW PINS
      ================================================= */}

      {pins.map(
        (pin) => {

          return (

            <Handle

              key={
                pin.handleId
              }

              id={
                pin.handleId
              }

              type="source"

              position={
                Position.Top
              }

              title={
                pin.label
              }

              style={{

                /*
                 * =====================================
                 * PIN POSITION
                 * =====================================
                 *
                 * Same coordinate system as SVG.
                 */

                left:
                  `${pin.x * SCALE}px`,

                top:
                  `${pin.y * SCALE}px`,

                /*
                 * =====================================
                 * PIN SIZE
                 * =====================================
                 */

                width:
                  `${10 * SCALE}px`,

                height:
                  `${10 * SCALE}px`,

                /*
                 * =====================================
                 * CENTER PIN ON HOLE
                 * =====================================
                 *
                 * Only translate here.
                 *
                 * DO NOT rotate this Handle.
                 *
                 * Parent already rotates it.
                 */

                transform:
                  `translate(
                    ${-5 * SCALE}px,
                    ${-5 * SCALE}px
                  )`,

                /*
                 * =====================================
                 * INVISIBLE HANDLE
                 * =====================================
                 */

                background:
                  "transparent",

                border:
                  "none",

                minWidth:
                  0,

                minHeight:
                  0,

                /*
                 * =====================================
                 * INTERACTION
                 * =====================================
                 */

                cursor:
                  "crosshair",

                pointerEvents:
                  "all",

                /*
                 * Must stay above SVG.
                 */

                zIndex:
                  10,
              }}

              /*
               * =======================================
               * PIN METADATA
               * =======================================
               */

              data-pin-id={
                pin.id
              }

              data-pin-name={
                pin.label
              }

              data-pin-type={
                pin.type
              }

              data-pin-direction={
                pin.direction
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

              data-description={
                pin.description
              }

            />

          );
        }
      )}

      {/* =================================================
          3. PIN HOVER LABEL
      ================================================= */}

      {/*
       * Handle itself is invisible.
       *
       * CSS :hover can therefore be unreliable
       * depending on React Flow's Handle styles.
       *
       * The native title above already gives:
       *
       * A1
       * B1
       * C1
       *
       * when hovering.
       *
       * So we keep the UI clean and don't add
       * extra visible elements over the board.
       */}

    </div>

  );
};

// =====================================================
// EXPORT
// =====================================================

export default BreadboardMiniNode;