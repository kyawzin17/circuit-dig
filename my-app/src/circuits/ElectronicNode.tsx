import React, { memo, useEffect } from "react";
import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from "reactflow";

import { PIN_CONFIGS } from "./constants/pins";

type PinDefinition = {
  name: string;
  x: number;
  y: number;
  dir: string;
  signals?: unknown[];
  source?: unknown[];
};

const ElectronicNode = ({
  id,
  data,
}: NodeProps) => {
  const pins: PinDefinition[] =
    (PIN_CONFIGS[data.componentType] as PinDefinition[]) ??
    [];

  const rotation =
    typeof data.rotation === "number"
      ? data.rotation
      : 0;

  const updateNodeInternals =
    useUpdateNodeInternals();

  useEffect(() => {
    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 300);

    return () => clearTimeout(timer);
  }, [rotation, updateNodeInternals, id]);

  const getHandlePosition = (side: string) => {
    switch (side) {
      case "top":
        return Position.Top;
      case "bottom":
        return Position.Bottom;
      case "left":
        return Position.Left;
      case "right":
        return Position.Right;
      default:
        return Position.Top;
    }
  };

  const componentType = String(
    data.componentType ?? ""
  ).toLowerCase();

  const simulation =
    data.simulation as
      | {
          isOn?: boolean;
          brightness?: number;
        }
      | undefined;

  const isLedOn =
    componentType.includes("led") &&
    simulation?.isOn === true;

  const brightness =
    typeof simulation?.brightness === "number"
      ? Math.max(0, Math.min(1, simulation.brightness))
      : 1;

  return (
    <div
      style={{
        transform: `rotate(${rotation}deg)`,
        transition:
          "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        filter: isLedOn
          ? `drop-shadow(0 0 ${10 + brightness * 18}px rgba(255, 80, 40, ${0.45 + brightness * 0.45}))`
          : undefined,
      }}
      className="group relative border-2 border-transparent hover:border-blue-400/60"
    >
      <div className="relative">
        {data.tag &&
          React.createElement(data.tag, {
            ...(data.props ?? {}),
          })}

        {pins.map((pin) => {
          const handleId = pin.name;

          return (
            <React.Fragment key={handleId}>
              <Handle
                id={pin.name}
                type="source"
                position={getHandlePosition(pin.dir)}
                className="absolute"
                title={pin.name}
                style={{
                  transform: "translate(-50%, -50%)",
                  width: "6px",
                  height: "6px",
                  borderRadius: "2px",
                  pointerEvents: "all",
                  left: `${pin.x}px`,
                  top: `${pin.y}px`,
                  zIndex: 20,
                }}
                data-pin-id={handleId}
                data-pin-name={handleId}
                data-signals={JSON.stringify(
                  pin.signals ?? []
                )}
              />

              <span
                className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-1.5 py-0.5 text-[8px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
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

export default memo(ElectronicNode);
