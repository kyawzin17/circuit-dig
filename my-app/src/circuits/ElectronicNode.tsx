// import React, { memo, useEffect } from "react";
// import {
//   Handle,
//   Position,
//   type NodeProps,
//   useUpdateNodeInternals,
// } from "reactflow";

// import { PIN_CONFIGS } from "./constants/pins";

// type PinDefinition = {
//   name: string;
//   x: number;
//   y: number;
//   dir: string;
//   signals?: unknown[];
//   source?: unknown[];
// };

// const ElectronicNode = ({
//   id,
//   data,
// }: NodeProps) => {
//   const pins: PinDefinition[] =
//     (PIN_CONFIGS[data.componentType] as PinDefinition[]) ??
//     [];

//   const rotation =
//     typeof data.rotation === "number"
//       ? data.rotation
//       : 0;

//   const updateNodeInternals =
//     useUpdateNodeInternals();

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       updateNodeInternals(id);
//     }, 300);

//     return () => clearTimeout(timer);
//   }, [rotation, updateNodeInternals, id]);

//   const getHandlePosition = (side: string) => {
//     switch (side) {
//       case "top":
//         return Position.Top;
//       case "bottom":
//         return Position.Bottom;
//       case "left":
//         return Position.Left;
//       case "right":
//         return Position.Right;
//       default:
//         return Position.Top;
//     }
//   };

//   const componentType = String(
//     data.componentType ?? ""
//   ).toLowerCase();

//   const simulation =
//     data.simulation as
//       | {
//           isOn?: boolean;
//           brightness?: number;
//         }
//       | undefined;

//   const isLedOn =
//     componentType.includes("led") &&
//     simulation?.isOn === true;

//   const brightness =
//     typeof simulation?.brightness === "number"
//       ? Math.max(0, Math.min(1, simulation.brightness))
//       : 1;

//   return (
//     <div
//       style={{
//         transform: `rotate(${rotation}deg)`,
//         transition:
//           "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
//         filter: isLedOn
//           ? `drop-shadow(0 0 ${10 + brightness * 18}px rgba(255, 80, 40, ${0.45 + brightness * 0.45}))`
//           : undefined,
//       }}
//       className="group relative border-2 border-transparent hover:border-blue-400/60"
//     >
//       <div className="relative">
//         {data.tag &&
//           React.createElement(data.tag, {
//             ...(data.props ?? {}),
//           })}

//         {pins.map((pin) => {
//           const handleId = pin.name;

//           return (
//             <React.Fragment key={handleId}>
//               <Handle
//                 id={pin.name}
//                 type="source"
//                 position={getHandlePosition(pin.dir)}
//                 className="absolute"
//                 title={pin.name}
//                 style={{
//                   transform: "translate(-50%, -50%)",
//                   width: "6px",
//                   height: "6px",
//                   borderRadius: "2px",
//                   pointerEvents: "all",
//                   left: `${pin.x}px`,
//                   top: `${pin.y}px`,
//                   zIndex: 20,
//                 }}
//                 data-pin-id={handleId}
//                 data-pin-name={handleId}
//                 data-signals={JSON.stringify(
//                   pin.signals ?? []
//                 )}
//               />

//               <span
//                 className="pointer-events-none absolute -top-9 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-1.5 py-0.5 text-[8px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
//               >
//                 {handleId}
//               </span>
//             </React.Fragment>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default memo(ElectronicNode);


import React, {
  memo,
  useEffect,
  useRef,
} from "react";

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

type SimulationState = {
  isOn?: boolean;
  brightness?: number;
};

const ElectronicNode = ({
  id,
  data,
}: NodeProps) => {

  // =========================================================
  // PINS
  // =========================================================

  const pins: PinDefinition[] =
    (PIN_CONFIGS[data.componentType] as PinDefinition[]) ??
    [];

  // =========================================================
  // ROTATION
  // =========================================================

  const rotation =
    typeof data.rotation === "number"
      ? data.rotation
      : 0;

  // =========================================================
  // REACT FLOW INTERNALS
  // =========================================================

  const updateNodeInternals =
    useUpdateNodeInternals();

  // =========================================================
  // WOKWI ELEMENT REF
  // =========================================================

  const componentRef =
    useRef<HTMLElement | null>(null);

  // =========================================================
  // UPDATE REACT FLOW HANDLES
  // =========================================================

  useEffect(() => {

    const timer = setTimeout(() => {
      updateNodeInternals(id);
    }, 300);

    return () => {
      clearTimeout(timer);
    };

  }, [
    rotation,
    updateNodeInternals,
    id,
  ]);

  // =========================================================
  // HANDLE POSITION
  // =========================================================

  const getHandlePosition = (
    side: string
  ) => {

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

  // =========================================================
  // COMPONENT TYPE
  // =========================================================

  const componentType =
    String(
      data.componentType ?? ""
    ).toLowerCase();

  // =========================================================
  // SIMULATION STATE
  // =========================================================

  const simulation =
    data.simulation as
      | SimulationState
      | undefined;

  const isLed =
    componentType.includes("led");

  const isLedOn =
    isLed &&
    simulation?.isOn === true;

  const brightness =
    typeof simulation?.brightness === "number"
      ? Math.max(
          0,
          Math.min(
            1,
            simulation.brightness
          )
        )
      : 1;

  // =========================================================
  // APPLY SIMULATION STATE TO WOKWI ELEMENT
  // =========================================================

  useEffect(() => {

    if (!isLed) {
      return;
    }

    const element =
      componentRef.current;

    if (!element) {
      return;
    }

    // * console.log(
    //   "[ElectronicNode] LED simulation update",
    //   {
    //     id,
    //     isOn: isLedOn,
    //     brightness,
    //     element,
    //   }
    // );

    /*
     * IMPORTANT
     *
     * Wokwi Elements is the visual layer.
     * Our simulator owns the simulation state.
     *
     * For now we expose the state on the
     * actual Wokwi LED DOM element.
     *
     * This gives us a clean bridge:
     *
     * SimulationEngine
     *      ↓
     * simulation.isOn
     *      ↓
     * ElectronicNode
     *      ↓
     * <wokwi-led>
     */

    (
      element as HTMLElement & {
        value?: number;
        brightness?: number;
      }
    ).value = isLedOn ? 1 : 0;

    (
      element as HTMLElement & {
        simulationOn?: boolean;
        simulationBrightness?: number;
      }
    ).simulationOn = isLedOn;

    (
      element as HTMLElement & {
        simulationOn?: boolean;
        simulationBrightness?: number;
      }
    ).simulationBrightness = brightness;

    /*
     * Also expose them as DOM attributes.
     * This is useful for debugging and for
     * custom Wokwi-element integration later.
     */

    element.setAttribute(
      "data-value",
      String(isLedOn)
    );

    element.setAttribute(
      "data-brightness",
      String(brightness)
    );

  }, [
    id,
    isLed,
    isLedOn,
    brightness,
  ]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      style={{
        transform:
          `rotate(${rotation}deg)`,

        transition:
          "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",

        filter:
          isLedOn
            ? `
              drop-shadow(
                0 0 ${10 + brightness * 18}px
                rgba(
                  255,
                  80,
                  40,
                  ${0.45 + brightness * 0.45}
                )
              )
            `
            : undefined,
      }}

      className="
        group
        relative
        border-2
        border-transparent
        hover:border-blue-400/60
      "
    >

      <div className="relative">

        {/* =====================================================
            WOKWI COMPONENT
        ===================================================== */}

        {data.tag &&
          React.createElement(
            data.tag,
            {
              ...(data.props ?? {}),

              /*
               * IMPORTANT:
               *
               * Save the real DOM element so the
               * simulation effect above can access it.
               */

              ref: isLed
                ? componentRef
                : undefined,
            }
          )}

        {/* =====================================================
            REACT FLOW PINS
        ===================================================== */}

        {pins.map((pin) => {

          const handleId =
            pin.name;

          return (
            <React.Fragment
              key={handleId}
            >

              <Handle
                id={pin.name}

                type="source"

                position={
                  getHandlePosition(
                    pin.dir
                  )
                }

                className="
                  absolute
                "

                title={pin.name}

                style={{
                  transform:
                    "translate(-50%, -50%)",

                  width: "6px",
                  height: "6px",

                  borderRadius: "2px",

                  pointerEvents:
                    "all",

                  left:
                    `${pin.x}px`,

                  top:
                    `${pin.y}px`,

                  zIndex: 20,
                }}

                data-pin-id={
                  handleId
                }

                data-pin-name={
                  handleId
                }

                data-signals={
                  JSON.stringify(
                    pin.signals ?? []
                  )
                }
              />

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

export default memo(
  ElectronicNode
);