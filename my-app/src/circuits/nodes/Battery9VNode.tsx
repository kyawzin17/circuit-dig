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

type BatteryPinType =
  | "power"
  | "ground";

type BatteryPin = {
  id: string;
  label: string;

  type: BatteryPinType;

  direction: "output";

  description?: string;

  voltage?: number;            // default: 9 (Volts)

  internalResistance?: number; // default: 1.5 - 2.0 (Ohms)

  capacityInMah?: number;      // default: 500 (mAh)

  x: number;

  y: number;

  handleId: string;
};

// =====================================================
// CONSTANTS
// =====================================================

const SCALE = 0.5;

const SVG_WIDTH = 240;
const SVG_HEIGHT = 360;

// =====================================================
// BATTERY TERMINALS CONFIG
// =====================================================

const batteryTerminals = [
  {
    id: "9v-b-vcc",
    label: "+9V",
    type: "power" as const,
    description: "Positive Terminal (+9V)",
    x: 80,
    y: 35,
    handleId: "9v-b-vcc",
  },
  {
    id: "9v-b-gnd",
    label: "GND",
    type: "ground" as const,
    description: "Negative Terminal (GND)",
    x: 160,
    y: 35,
    handleId: "9v-b-gnd",
  },
];

// =====================================================
// BATTERY PIN BUILDER
// =====================================================

function createBatteryPins(): BatteryPin[] {
  return batteryTerminals.map((term) => ({
    id: term.id,

    label: term.label,

    type: term.type,

    direction: "output",

    description: term.description,

    voltage: 9,

    internalResistance: 1.5,

    capacityInMah: 500,
    
    x: term.x,

    y: term.y,

    handleId: term.handleId,
  }));
}

// =====================================================
// COMPONENT
// =====================================================

const Battery9VNode = ({
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
      }, 300);

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

  const pins = useMemo(
    () => createBatteryPins(),
    []
  );

  // ===================================================
  // BOARD SIZE
  // ===================================================

  const nodeWidth =
    SVG_WIDTH * SCALE;

  const nodeHeight =
    SVG_HEIGHT * SCALE;

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

        transformOrigin:
          "center center",

        transition:
          "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >

      {/* =================================================
          SVG 9V BATTERY VISUAL
      ================================================= */}

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
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
            DEFINITIONS & GRADIENTS
        ================================================= */}

        <defs>
          <linearGradient
            id="battery-body-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#1F2937" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          <linearGradient
            id="gold-stripe-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          <linearGradient
            id="metal-snap-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#E5E7EB" />
            <stop offset="50%" stopColor="#9CA3AF" />
            <stop offset="100%" stopColor="#4B5563" />
          </linearGradient>
        </defs>

        {/* =================================================
            BATTERY BASE BODY
        ================================================= */}

        <rect
          x="20"
          y="70"
          width="200"
          height="270"
          rx="16"
          fill="url(#battery-body-grad)"
          stroke="#111827"
          strokeWidth="3"
        />

        {/* TOP INSULATOR / HEADER PLATE */}

        <rect
          x="30"
          y="50"
          width="180"
          height="30"
          rx="6"
          fill="#374151"
          stroke="#1F2937"
          strokeWidth="2"
        />

        {/* =================================================
            GOLD / ORANGE BRAND STRIPE
        ================================================= */}

        <rect
          x="20"
          y="150"
          width="200"
          height="70"
          fill="url(#gold-stripe-grad)"
        />

        {/* =================================================
            TERMINALS (SNAP CONNECTORS)
        ================================================= */}

        {/* POSITIVE (+) TERMINAL - SMALL OCTAGON/STUD */}

        <circle
          cx="80"
          cy="35"
          r="14"
          fill="url(#metal-snap-grad)"
          stroke="#374151"
          strokeWidth="2"
        />

        <circle
          cx="80"
          cy="35"
          r="8"
          fill="#9CA3AF"
        />

        {/* NEGATIVE (-) TERMINAL - LARGE CROWN/STUD */}

        <circle
          cx="160"
          cy="35"
          r="18"
          fill="url(#metal-snap-grad)"
          stroke="#374151"
          strokeWidth="2"
        />

        <circle
          cx="160"
          cy="35"
          r="11"
          fill="#4B5563"
        />

        {/* =================================================
            POLARITY & TEXT LABELS
        ================================================= */}

        {/* POSITIVE ICON */}

        <text
          x="80"
          y="110"
          fontFamily="Arial"
          fontSize="22"
          fontWeight="bold"
          fill="#EF4444"
          textAnchor="middle"
        >
          +
        </text>

        {/* NEGATIVE ICON */}

        <text
          x="160"
          y="110"
          fontFamily="Arial"
          fontSize="26"
          fontWeight="bold"
          fill="#9CA3AF"
          textAnchor="middle"
        >
          -
        </text>

        {/* BRAND / VOLTAGE TEXT */}

        <text
          x="120"
          y="195"
          fontFamily="Arial"
          fontSize="28"
          fontWeight="900"
          fill="#FFFFFF"
          textAnchor="middle"
          letterSpacing="2"
        >
          9V
        </text>

        <text
          x="120"
          y="270"
          fontFamily="Arial"
          fontSize="14"
          fontWeight="bold"
          fill="#9CA3AF"
          textAnchor="middle"
          letterSpacing="3"
        >
          POWER SUPPLY
        </text>

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
              `${12 * SCALE}px`,

            height:
              `${12 * SCALE}px`,

            transform:
              `translate(
                ${-6 * SCALE}px,
                ${-6 * SCALE}px
              )`,

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

          data-voltage={
            pin.voltage
          }

          data-direction={
            pin.direction
          }

        />

      ))}

    </div>
  );
};

// =====================================================
// EXPORT
// =====================================================

export default Battery9VNode;