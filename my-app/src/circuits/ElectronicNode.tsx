import React, {
  memo,
  useEffect,
  useRef,
} from "react";

import {
  Handle,
  Position,
  type NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
} from "reactflow";

import { PIN_CONFIGS } from "./constants/pins";

type PinDefinition = {
  id: string;
  name: string;
  pinType: string;
  expectedSignal: string;
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

  const { setNodes } = useReactFlow();

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

  const isPushButton =
    componentType === "pushbutton" ||
    componentType === "button";

  const isPotentiometer =
    componentType === "potentiometer" ||
    componentType === "pot";

  const isSlideSwitch =
    componentType === "slide-switch" ||
    componentType === "switch";

  const isLdr =
    componentType === "ldr" ||
    componentType === "photoresistor" ||
    componentType === "wokwi-photoresistor-sensor";

  const isSevenSegment =
    componentType === "7segment" ||
    componentType === "sevensegment" ||
    componentType === "seven-segment";

  const potentiometerPosition =
    typeof data.potentiometerPosition === "number"
      ? Math.max(
          0,
          Math.min(
            1,
            data.potentiometerPosition,
          ),
        )
      : 0.5;

  const isPressed =
    data.pressed === true ||
    data.isPressed === true;

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
  // 7-SEGMENT -> CIRCUIT STATE
  // =========================================================

  const sevenSegmentState =
    data.simulation?.sevenSegment as
      | {
          values?: number[];
          colon?: boolean;
        }
      | undefined;

  useEffect(() => {
    if (!isSevenSegment) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            values?: number[];
            colonValue?: boolean;
          })
        | null;

    if (!element) {
      return;
    }

    element.values =
      Array.isArray(sevenSegmentState?.values)
        ? sevenSegmentState.values
        : [0, 0, 0, 0, 0, 0, 0, 0];

    element.colonValue =
      sevenSegmentState?.colon === true;
  }, [
    isSevenSegment,
    sevenSegmentState?.values,
    sevenSegmentState?.colon,
  ]);

  // =========================================================
  // POTENTIOMETER -> CIRCUIT STATE
  // =========================================================
  useEffect(() => {
    if (!isPotentiometer) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            value?: number | string;
          })
        | null;

    if (!element) {
      return;
    }

    /*
     * Wokwi exposes the potentiometer value as 0..1023.
     * Our circuit model stores a normalized 0..1 wiper position.
     */
    element.value = Math.round(
      potentiometerPosition * 1023,
    );

    const handleInput = () => {
      const rawValue =
        Number(element.value);

      if (!Number.isFinite(rawValue)) {
        return;
      }

      const position =
        Math.max(
          0,
          Math.min(
            1,
            rawValue / 1023,
          ),
        );

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  potentiometerPosition:
                    position,
                },
              }
            : node,
        ),
      );
    };

    element.addEventListener(
      "input",
      handleInput,
    );
    element.addEventListener(
      "change",
      handleInput,
    );

    return () => {
      element.removeEventListener(
        "input",
        handleInput,
      );
      element.removeEventListener(
        "change",
        handleInput,
      );
    };
  }, [
    id,
    isPotentiometer,
    potentiometerPosition,
    setNodes,
  ]);

  // =========================================================
  // LDR / PHOTORESISTOR -> CIRCUIT STATE
  // =========================================================
  const ldrLux =
    typeof data.ldrLux === "number"
      ? Math.max(0.1, Math.min(100000, data.ldrLux))
      : 500;

  const ldrGamma =
    typeof data.ldrGamma === "number"
      ? Math.max(0.05, data.ldrGamma)
      : 0.7;

  const ldrRl10 =
    typeof data.ldrRl10 === "number"
      ? Math.max(0.1, data.ldrRl10)
      : 50;

  const ldrThreshold =
    typeof data.ldrThreshold === "number"
      ? Math.max(0, Math.min(5, data.ldrThreshold))
      : 2.5;

  const ldrSliderValue =
    ((Math.log10(ldrLux) + 1) / 6) * 100;

  const updateLdrLux = (slider: number) => {
    const nextLux =
      Math.pow(
        10,
        -1 + (Math.max(0, Math.min(100, slider)) / 100) * 6,
      );

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ldrLux: nextLux,
              },
            }
          : node,
      ),
    );
  };

  useEffect(() => {
    if (!isLdr) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            lux?: number | string;
            threshold?: number | string;
            rl10?: number | string;
            gamma?: number | string;
          })
        | null;

    if (!element) {
      return;
    }

    element.lux = ldrLux;
    element.threshold = ldrThreshold;
    element.rl10 = ldrRl10;
    element.gamma = ldrGamma;

    element.setAttribute("lux", String(ldrLux));
    element.setAttribute("threshold", String(ldrThreshold));
    element.setAttribute("rl10", String(ldrRl10));
    element.setAttribute("gamma", String(ldrGamma));
  }, [
    isLdr,
    ldrLux,
    ldrThreshold,
    ldrRl10,
    ldrGamma,
  ]);

  // =========================================================
  // PUSHBUTTON -> CIRCUIT STATE
  // =========================================================

  useEffect(() => {
    if (!isPushButton) {
      return;
    }

    const element =
      componentRef.current;

    if (!element) {
      return;
    }

    const buttonElement =
      element as HTMLElement & {
        pressed?: boolean;
      };

    const setPressed = (pressed: boolean) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.id !== id) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              pressed,
              isPressed: pressed,
            },
          };
        }),
      );
    };

    const handlePress = () => {
      setPressed(true);
    };

    const handleRelease = () => {
      setPressed(false);
    };

    element.addEventListener(
      "button-press",
      handlePress,
    );

    element.addEventListener(
      "button-release",
      handleRelease,
    );

    // Keep the visual web component synchronized with
    // the simulator's source of truth.
    buttonElement.pressed =
      isPressed;

    return () => {
      element.removeEventListener(
        "button-press",
        handlePress,
      );

      element.removeEventListener(
        "button-release",
        handleRelease,
      );
    };
  }, [
    id,
    isPushButton,
    isPressed,
    setNodes,
  ]);

  // =========================================================
  // SLIDE SWITCH -> CIRCUIT STATE
  // =========================================================
  useEffect(() => {
    if (!isSlideSwitch) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            value?: number | string;
          })
        | null;

    if (!element) {
      return;
    }

    const currentValue =
      data.switchValue === 1 ||
      data.on === true ||
      data.isOn === true ||
      data.closed === true
        ? 1
        : 0;

    // Wokwi's slide switch exposes value 0/1.
    element.value = currentValue;

    const handleInput = (event: Event) => {
      const target =
        event.currentTarget as
          | (HTMLElement & {
              value?: number | string;
            })
          | null;

      const value =
        Number(target?.value ?? 0) === 1
          ? 1
          : 0;

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  switchValue: value,
                  on: value === 1,
                  isOn: value === 1,
                  closed: value === 1,
                },
              }
            : node,
        ),
      );
    };

    element.addEventListener(
      "input",
      handleInput,
    );

    return () => {
      element.removeEventListener(
        "input",
        handleInput,
      );
    };
  }, [
    data.closed,
    data.isOn,
    data.on,
    data.switchValue,
    id,
    isSlideSwitch,
    setNodes,
  ]);

  // Keep the simulator state as the single source of truth
  // while allowing the Wokwi element to render the switch state.
  useEffect(() => {
    if (!isSlideSwitch) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            value?: number | string;
          })
        | null;

    if (!element) {
      return;
    }

    const value =
      data.switchValue === 1 ||
      data.on === true ||
      data.isOn === true ||
      data.closed === true
        ? 1
        : 0;

    element.value = value;
  }, [
    data.closed,
    data.isOn,
    data.on,
    data.switchValue,
    isSlideSwitch,
  ]);

  // =========================================================
  // PUSHBUTTON POINTER FALLBACK
  // =========================================================
  //
  // Some versions of @wokwi/elements dispatch the button events
  // from the internal SVG/shadow DOM. ReactFlow can also intercept
  // pointer events around a custom node. Keep a DOM-level fallback
  // so a real mouse/touch press always reaches the circuit state.
  // This does not bypass the simulator: the resulting pressed state
  // is consumed by DigitalInputSolver -> AVR PINx -> digitalRead().
  // =========================================================
  const handlePushButtonPointerDown = (
    event: React.PointerEvent,
  ) => {
    if (!isPushButton) {
      return;
    }

    event.stopPropagation();

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                pressed: true,
                isPressed: true,
              },
            }
          : node,
      ),
    );
  };

  const handlePushButtonPointerUp = (
    event: React.PointerEvent,
  ) => {
    if (!isPushButton) {
      return;
    }

    event.stopPropagation();

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                pressed: false,
                isPressed: false,
              },
            }
          : node,
      ),
    );
  };

  const handlePushButtonPointerLeave = (
    event: React.PointerEvent,
  ) => {
    if (!isPushButton) {
      return;
    }

    if (event.buttons === 0) {
      return;
    }

    event.stopPropagation();

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                pressed: false,
                isPressed: false,
              },
            }
          : node,
      ),
    );
  };

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

    /*
     * Wokwi Elements is the visual layer.
     * The simulator owns the electrical state.
     *
     * wokwi-led exposes:
     *   value      -> boolean
     *   brightness -> 0..1
     *
     * So the bridge stays explicit:
     *
     * AVR -> circuit solver -> LED runtime
     *     -> React node state -> wokwi-led
     */
    const ledElement =
      element as HTMLElement & {
        value?: boolean;
        brightness?: number;
      };

    ledElement.value = isLedOn;
    ledElement.brightness = isLedOn
      ? brightness
      : 0;

    element.setAttribute(
      "data-simulation-on",
      String(isLedOn),
    );

    element.setAttribute(
      "data-simulation-brightness",
      String(
        isLedOn
          ? brightness
          : 0,
      ),
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
      onPointerDown={
        isPushButton
          ? handlePushButtonPointerDown
          : undefined
      }
      onPointerUp={
        isPushButton
          ? handlePushButtonPointerUp
          : undefined
      }
      onPointerCancel={
        isPushButton
          ? handlePushButtonPointerUp
          : undefined
      }
      onPointerLeave={
        isPushButton
          ? handlePushButtonPointerLeave
          : undefined
      }
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

              ref:
                isLed ||
                isPushButton ||
                isPotentiometer ||
                isSlideSwitch ||
                isLdr ||
                isSevenSegment
                  ? componentRef
                  : undefined,
            }
          )}

        {isLdr && (
          <div
            className="absolute left-1/2 top-full z-40 mt-2 w-36 -translate-x-1/2 rounded-lg border border-slate-300 bg-white/95 px-2 py-2 shadow-lg backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between text-[8px] font-medium text-slate-500">
              <span>0.1 lux</span>
              <span className="font-semibold text-slate-700">
                {ldrLux >= 1000
                  ? (ldrLux / 1000).toFixed(1) + "k"
                  : ldrLux.toFixed(1)} lux
              </span>
              <span>100k</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={ldrSliderValue}
              onChange={(event) =>
                updateLdrLux(
                  Number(event.target.value),
                )
              }
              className="h-1.5 w-full cursor-pointer accent-cyan-500"
              aria-label="LDR light intensity"
            />

            <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400">
              <span>Dark</span>
              <span>
                AO threshold {ldrThreshold.toFixed(2)}V
              </span>
              <span>Bright</span>
            </div>
          </div>
        )}

        {isPotentiometer && (
          <div
            className="absolute left-1/2 top-full z-40 mt-2 w-24 -translate-x-1/2 rounded-lg border border-slate-300 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between text-[8px] font-medium text-slate-500">
              <span>0V</span>
              <span>
                {(potentiometerPosition * 5).toFixed(2)}V
              </span>
              <span>5V</span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={potentiometerPosition}
              onChange={(event) => {
                const position =
                  Number(event.target.value);

                setNodes((currentNodes) =>
                  currentNodes.map((node) =>
                    node.id === id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            potentiometerPosition:
                              position,
                          },
                        }
                      : node,
                  ),
                );
              }}
              className="h-1.5 w-full cursor-pointer accent-cyan-500"
              aria-label="Potentiometer position"
            />
          </div>
        )}

        {/* =====================================================
            REACT FLOW PINS
        ===================================================== */}

        {pins.map((pin : any) => {

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
                {data.label}
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