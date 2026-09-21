import React, { useState, useCallback, useRef, useEffect } from "react";

import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type EdgeTypes,
  type Connection,
  type Edge,
  type ReactFlowInstance,
  useReactFlow,
} from "reactflow";

import "reactflow/dist/style.css";

// * ----------> Components Circuit Pins For Right Sidebar Pin Panel <----------
import { arduinoUnoPins } from "./pins/arduinoUnoPins.ts";
import { resistorPins } from "./pins/resistorPins.ts";
import { ledPins } from "./pins/ledPins.ts";
import { buzzerPins } from "./pins/buzzerPins.ts";
import { hcsr04Pins } from "./pins/hcsr04Pins.ts";
import { servoPins } from "./pins/servoMotorPins.ts";
import { lcd1602I2cPins } from "./pins/lcd1602_i2cPins.ts";
import { lcd1602Pins } from "./pins/lcd1602Pins.ts";
import { miniBreadboardPins } from "./pins/miniBreadBoardPins.ts";
import { halfBreadboardPins } from "./pins/halfBreadBoardPins.ts";
import { fullBreadboardPins } from "./pins/fullBreadBoardPins.ts";
import { pushbuttonPins } from "./pins/pushButtonPins.ts";
import { potentiometerPins } from "./pins/potentiometerPins.ts";
import { slideSwitchPins } from "./pins/slideSwitchPins.ts";
import { sevenSegmentPins } from "./pins/7-segmentPins.ts";
import { keypadPins } from "./pins/keypadPins.ts";
import { neopixelPins } from "./pins/neoPixelPins.ts";
import { arduinoMegaPins } from "./pins/arduinoMegaPins.ts";
import { arduinoNanoPins } from "./pins/arduinoNanoPins.ts";  
import { esp32Pins } from "./pins/esp32Pins.ts";
import { ldrModulePins } from "./pins/ldrSensorPins.ts";
import { pirPins } from "./pins/pirMotionSensorPins.ts";
import { ds1307Pins } from "./pins/ds1307Pins.ts";
import { oledSsd1306SpiPins } from "./pins/ssd1306Pins.ts";
import { batteryPins } from "./pins/battery9VPins.ts";

// * ----------> Icons <----------
import { ChevronDown, ZoomIn, ZoomOut, Maximize, Check, Undo, Redo } from "lucide-react";
import { MdDeleteForever } from "react-icons/md";
import { FaRegSave } from "react-icons/fa";
import { FaArrowsRotate } from "react-icons/fa6";
import { LuGrid2X2X, LuGrid2X2Plus, LuCode } from "react-icons/lu";

// * ----------> Components <----------
import EditableEdge from "./EditableEdge"; // Editable Edge Component (Custom Edge Component)
import Sidebar from "./Sidebar.tsx";  // Left Sidebar Component (For drag and drop nodes)
import PropertiesPanel from "./PropertiesPanel"; // Properties Panel Component (Right Sidebar)
import ElectronicNode from "./ElectronicNode.tsx"; // Electronic Custom Node Component (For Pin Handling)
import CodeSection from "./CodeSection.tsx"; // Code Section Component (For Code Editing & C++)

// * ----------> Components Custom Nodes (For Component Handling & Design) <----------
import BreadboardMiniNode from "./nodes/BreadboardMiniNode";
import BreadboardHalfNode from "./nodes/BreadboardHalfNode.tsx";
import BreadboardFullNode from "./nodes/BreadboardFullNode.tsx";
import Battery9VNode from "./nodes/Battery9VNode.tsx";
import PicoNode from "./nodes/Respberrypipico.tsx";

// * ----------> Simulation Engine <----------
import { useSimulationStore } from "../stores/simulationStore"; // Simulation Store for Simulation Engine ()
import { SimulationEngine } from "./simulator/core/SimulationEngine.ts"; // Simulation Engine Component

// * ----------> Types <----------
// Circuit Edge Data Type (For Simulation Engine)
type CircuitEdgeData = {
  points: unknown;

  sourceNodeId: string;
  sourcePinId: string | null;

  targetNodeId: string;
  targetPinId: string | null;

  simulation?: {
    isActive: boolean;
    currentMa?: number;
    netId?: string;
  };
};
type CircuitEdge = Edge<CircuitEdgeData>;

// Edge Types
const edgeTypes: EdgeTypes = {
  editable: EditableEdge,
};

// Node Types
const nodeTypes = {
  electronicNode: ElectronicNode,
  breadboardMiniNode: BreadboardMiniNode,
  breadboardHalfNode: BreadboardHalfNode,
  breadboardFullNode: BreadboardFullNode,
  battery9VNode: Battery9VNode,
  picoNode: PicoNode,
};

// * ----------> Constants <----------
const zoomLevels = [ 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2 ]; // Zoom Levels for Canvas (For Zooming In/Out)
const GRID_SIZE = 10;


// * ----------> Edge Color <----------
// Edge Color Function (For Edge Color Handling)
function getEdgeAutoColor(types: string): string {
  const checkPin = (pin: string) => {
    const name = pin.toUpperCase();
    
    if (name.includes("GND") || types.includes("GND")) return "#000000"; // Black
    if (name.includes("5V") || name.includes("VCC") || types.includes("POWER")) return "#EF4444"; // Red
    if (name.includes("3.3V") || types.includes("3V3")) return "#F97316"; // Orange
    if (types.includes("ANALOG") || name.startsWith("A")) return "#3B82F6"; // Blue
    if (types.includes("DIGITAL") || name.startsWith("D")) return "#22C55E"; // Green
    
    return null;
  };

  checkPin(types);
  // 3. ရိုးရိုး Signal ကြိုးများအတွက် Default Color
  return "#10B981"; // Default Green
}

/* =========================================================
   HELPER
========================================================= */

const createWireId = () => {
  return `wire-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

/**
 * Convert React Flow connection information
 * into our own circuit-domain connection data.
 *
 * Example:
 *
 * Arduino D13 -> Resistor A
 *
 * {
 *   sourceNodeId: "arduino-123",
 *   sourcePinId: "D13",
 *   targetNodeId: "resistor-456",
 *   targetPinId: "A"
 * }
 */
const createConnectionData = (
  connection: Connection
): CircuitEdgeData => {
  return {
    points: null,

    sourceNodeId: connection.source!,
    sourcePinId: connection.sourceHandle ?? null,

    targetNodeId: connection.target!,
    targetPinId: connection.targetHandle ?? null,
  };
};

// ? =========> ZOOM CONTROLS <========= 

const ZoomControls = () => {
  const {
    getZoom,
    zoomIn,
    zoomOut,
    fitView,
    setViewport,
  } = useReactFlow();

  const [showZoomLevels, setShowZoomLevels] =
    useState(false);

  const [currentZoom, setCurrentZoom] =
    useState(1);

  useEffect(() => {
    const updateZoom = () => {
      setCurrentZoom(getZoom());
    };

    updateZoom();

    const interval = window.setInterval(
      updateZoom,
      100
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [getZoom]);

  const zoomPercentage =
    Math.round(currentZoom * 100);

  const handleZoomIn = () => {
    zoomIn({
      duration: 200,
    });
  };

  const handleZoomOut = () => {
    zoomOut({
      duration: 200,
    });
  };

  const handleZoomLevel = (
    level: number
  ) => {
    setViewport(
      {
        x: 0,
        y: 0,
        zoom: level,
      },
      {
        duration: 300,
      }
    );

    setShowZoomLevels(false);
  };

  const handleFitView = () => {
    fitView({
      padding: 0.2,
      duration: 300,
    });
  };
  return (
    <div className="absolute bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white/95 p-1 shadow-xl backdrop-blur">

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>

        {/* Zoom Percentage */}
        <button
          type="button"
          onClick={() =>
            setShowZoomLevels((prev) => !prev)
          }
          className="flex h-9 min-w-16.25 items-center justify-center gap-1 rounded-lg px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {zoomPercentage}%
          <ChevronDown size={14} />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>

        {/* Fit View */}
        <button
          type="button"
          onClick={handleFitView}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          title="Fit view"
        >
          <Maximize size={17} />
        </button>

        {/* Zoom Menu */}
        {showZoomLevels && (
          <div className="absolute bottom-12 left-1/2 w-28 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {zoomLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => handleZoomLevel(level)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition hover:bg-slate-100 ${
                  Math.abs(currentZoom - level) < 0.01
                    ? "bg-slate-100 font-semibold"
                    : ""
                }`}
              >
                <span>
                  {Math.round(level * 100)}%
                </span>

                {Math.abs(currentZoom - level) < 0.01 && (
                  <Check size={14} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ? ==========> MAIN COMPONENT <==========

const CircuitEditor = () => {

  // ! SIMULATION ENGINE
  const simulationEngine =
  useRef<SimulationEngine | null>(null);


  useEffect(() => {
  const engine =
    new SimulationEngine({
      onStateChange: (state) => {
        /*
         * Component visualization:
         * AVR -> GPIO -> digital solver -> LED state
         */
        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            const ledState = state.ledStates[node.id];
            const componentType = String(
              node.data?.componentType ??
                node.type ??
                "",
            ).toLowerCase();

            if (!componentType.includes("led")) {
              return node;
            }

            return {
              ...node,
              data: {
                ...node.data,
                simulation: {
                  ...(node.data?.simulation ?? {}),
                  isOn: ledState?.isOn === true,
                  brightness:
                    typeof ledState?.brightness === "number"
                      ? ledState.brightness
                      : 0,
                },
              },
            };
          }),
        );

        /*
         * Electrical visualization:
         * current-flow solver -> physical wire state
         */
        setEdges((currentEdges) =>
          currentEdges.map((edge) => {
            const wireState =
              state.wireStates?.[edge.id];

            return {
              ...edge,
              data: {
                ...(edge.data ?? {}),
                simulation: {
                  isActive:
                    wireState?.isActive === true,
                  currentMa:
                    wireState?.currentMa,
                  netId:
                    wireState?.netId,
                },
              },
            };
          }),
        );
      },

      onError: (error) => {
        console.error(
          "[Simulation Error]",
          error
        );
      },
    });

  simulationEngine.current =
    engine;

  return () => {
    engine.stop();

    simulationEngine.current =
      null;
  };
}, []);


const handleRunSimulation = () => {
  const engine = simulationEngine.current;
  console.log("This is the engine:", engine);
  if (!engine) {
    return;
  }

  const currentCode =
    useSimulationStore.getState().code;

  try {
    engine.stop();

    engine.setCircuit(
      nodes,
      edges as CircuitEdge[],
    );

    if (currentCode.trim()) {
      const hex =
        useSimulationStore.getState().hex;

      if (!hex) {
        useSimulationStore.setState({
          status: "error",
          error:
            "No compiled Arduino HEX is available.",
        });
        return;
      }

      /*
       * Firmware exists: load the real Arduino HEX
       * and let AVR8JS drive the GPIO pins.
       */
      engine.loadHex(hex);
    } else {
      /*
       * Empty sketch: start power-only simulation.
       *
       * The Uno's 5V/3.3V/IOREF/GND rails are still
       * active even when no firmware is loaded.
       */
      useSimulationStore.setState({
        status: "idle",
        error: null,
      });
    }

    engine.start();

    useSimulationStore.getState().setRunning();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    useSimulationStore.setState({
      status: "error",
      error: message,
    });
  }
};

const handleStopSimulation = () => {
  simulationEngine.current?.stop();
  stop();
};

const handlePauseSimulation = () => {
  simulationEngine.current?.pause();
};
  /* =======================================================
     REFS
  ======================================================= */

  const reactFlowWrapper =
    useRef<HTMLDivElement>(null);

  const nodesRef = useRef<any[]>([]);
  const edgesRef = useRef<CircuitEdge[]>([]);

  const [showCode, setShowCode] = useState<boolean>(false);
  /* =======================================================
     REACT FLOW STATE
  ======================================================= */

  const [nodes, setNodes, onNodesChange] =
    useNodesState([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState([]);

  /*
   * Keep live component state (for example a pressed pushbutton)
   * synchronized with the running simulator without rebuilding
   * the electrical topology.
   */
  useEffect(() => {
    simulationEngine.current?.updateNodes(
      nodes,
    );
  }, [nodes]);

  const [
    reactFlowInstance,
    setReactFlowInstance,
  ] = useState<ReactFlowInstance | null>(null);

  /* =======================================================
     UI STATE
  ======================================================= */

  const [grid, setGrid] =
    useState<boolean>(true);

  const simulationStatus =
  useSimulationStore(
    (state) => state.status
  );

const simulationCode =
  useSimulationStore(
    (state) => state.code
  );

const compile =
  useSimulationStore(
    (state) => state.compile
  );

const stop =
  useSimulationStore(
    (state) => state.stop
  );

  const [selectedNode, setSelectedNode] =
    useState<any>(null);

  const [edgeMenu, setEdgeMenu] =
    useState<{
      id: string;
      x: number;
      y: number;
      color: string;
    } | null>(null);

  /* =======================================================
     KEEP REFS IN SYNC
  ======================================================= */

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges as CircuitEdge[];
  }, [edges]);

  /* =======================================================
     HISTORY
  ======================================================= */

  const [history, setHistory] = useState<{
    stack: {
      nodes: any[];
      edges: CircuitEdge[];
    }[];

    index: number;
  }>({
    stack: [
      {
        nodes: [],
        edges: [],
      },
    ],
    index: 0,
  });

  const updateResistorValue = useCallback(
  (nodeId: string, value: string) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        if (node.data?.componentType !== "resistor") {
          return node;
        }

        return {
          ...node,

          data: {
            ...node.data,

            props: {
              ...(node.data.props ?? {}),
              value,
            },
          },
        };
      })
    );
  },
  [setNodes]
);

  /* =======================================================
     PUSH HISTORY
  ======================================================= */

  const pushToHistory = useCallback(
    (
      newNodes: any[],
      newEdges: CircuitEdge[]
    ) => {
      setHistory((prev) => {
        const cleanStack =
          prev.stack.slice(0, prev.index + 1);

        const clonedNodes = JSON.parse(
          JSON.stringify(newNodes)
        );

        const clonedEdges = JSON.parse(
          JSON.stringify(newEdges)
        );

        return {
          stack: [
            ...cleanStack,
            {
              nodes: clonedNodes,
              edges: clonedEdges,
            },
          ],
          index: cleanStack.length,
        };
      });
    },
    []
  );

  /* =======================================================
     UNDO
  ======================================================= */

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.index <= 0) {
        return prev;
      }

      const nextIndex = prev.index - 1;

      setNodes(prev.stack[nextIndex].nodes);
      setEdges(prev.stack[nextIndex].edges);

      return {
        ...prev,
        index: nextIndex,
      };
    });
  }, [setNodes, setEdges]);

  /* =======================================================
     REDO
  ======================================================= */

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (
        prev.index >=
        prev.stack.length - 1
      ) {
        return prev;
      }

      const nextIndex = prev.index + 1;

      setNodes(prev.stack[nextIndex].nodes);
      setEdges(prev.stack[nextIndex].edges);

      return {
        ...prev,
        index: nextIndex,
      };
    });
  }, [setNodes, setEdges]);

  /* =======================================================
     CONNECT
  ======================================================= */

  const onConnect = useCallback(
    (params: Connection) => {
      /** 
       * React Flow guarantees (အာမခံ) source and target for a valid connection (မှန်ကန်တဲ့ ချိပ်ဆက်မှု).
       *
       * Still guard (စောင့်ကြည့်တာ) here because our domain layer requires both.
       */
      if (
        !params.source ||
        !params.target
      ) {
        return;
      }
      console.log(params);
      const strokeColor = getEdgeAutoColor(params.targetHandle ?? "");

      const connectionData =
        createConnectionData(params);

      const newEdge: CircuitEdge = {
        id: createWireId(),

        source: params.source,
        sourceHandle:
          params.sourceHandle ?? null,

        target: params.target,
        targetHandle:
          params.targetHandle ?? null,

        type: "editable",

        data: connectionData,

        style: {
          strokeWidth: 2,
          stroke: strokeColor,
        },
      };

      const currentNodes =
        nodesRef.current;

      const currentEdges =
        edgesRef.current;

      const nextEdges = addEdge(
        newEdge,
        currentEdges
      ) as CircuitEdge[];

      setEdges(nextEdges);

      pushToHistory(
        currentNodes,
        nextEdges
      );
    },
    [setEdges, pushToHistory]
  );

  /* =======================================================
     EDGE UPDATE / RECONNECT
  ======================================================= */

  const onEdgeUpdate = useCallback(
    (
      oldEdge: Edge,
      newConnection: Connection
    ) => {
      if (
        !newConnection.source ||
        !newConnection.target
      ) {
        return;
      }

      const currentEdges =
        edgesRef.current;

      const nextEdges =
        currentEdges.map((edge) => {
          if (edge.id !== oldEdge.id) {
            return edge;
          }

          const sourcePinId =
            newConnection.sourceHandle ??
            null;

          const targetPinId =
            newConnection.targetHandle ??
            null;

          const updatedData: CircuitEdgeData = {
            ...(edge.data ?? {
              points: null,
              sourceNodeId: "",
              sourcePinId: null,
              targetNodeId: "",
              targetPinId: null,
            }),

            sourceNodeId:
              newConnection.source ?? "",  // Guard against null

            sourcePinId,

            targetNodeId:
              newConnection.target ?? "",  // Guard against null

            targetPinId,
          };

          return {
            ...edge,

            source:
              newConnection.source,

            sourceHandle:
              sourcePinId,

            target:
              newConnection.target,

            targetHandle:
              targetPinId,

            data: updatedData,

            style: {
              ...edge.style,

              stroke: getEdgeAutoColor(
                targetPinId ?? ""
              ),
            },
          };
        });

      setEdges(nextEdges as CircuitEdge[]);

      pushToHistory(
        nodesRef.current,
        nextEdges as CircuitEdge[]
      );
    },
    [setEdges, pushToHistory]
  );

  /* =======================================================
     DROP
  ======================================================= */

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      event.dataTransfer.dropEffect =
        "move";
    },
    []
  );

  /* =======================================================
     DROP COMPONENT
  ======================================================= */

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) {
        return;
      }

      const type =
        event.dataTransfer.getData(
          "application/reactflow"
        );

        // * console.log(type);

      if (!type) {
        return;
      }

      /* ===================================================
         COMPONENT CONFIG
      =================================================== */

      const componentConfigs: Record<
        string,
        any
      > = {
        "arduino-uno": {
          label: "Arduino Uno",
          tag: "wokwi-arduino-uno",
          props: {},
          pins: arduinoUnoPins,
          scale: 0.2,
          yOffset: "-15px",
        },

        "arduino-mega": {
          label: "Arduino Mega",
          tag: "wokwi-arduino-mega",
          props: {},
          pins: arduinoMegaPins,
          scale: 0.2,
          yOffset: "-15px",
        },

        "arduino-nano": {
          label: "Arduino Nano",
          tag: "wokwi-arduino-nano",
          props: {},
          pins: arduinoNanoPins,
          scale: 0.2,
          yOffset: "-15px",
        },

        "esp32": {
          label: "ESP32 DevKit",
          tag: "wokwi-esp32-devkit-v1",
          props: {},
          pins: esp32Pins,
          scale: 0.18,
          yOffset: "0px",
        },

        resistor: {
          label: "Resistor",
          tag: "wokwi-resistor",
          props: {},
          pins: resistorPins,
        },

        "led-blue": {
          label: "Blue LED",
          tag: "wokwi-led",
          props: {
            color: "blue",
          },
          pins: ledPins,
        },

        "led-green": {
          label: "Green LED",
          tag: "wokwi-led",
          props: {
            color: "green",
          },
          pins: ledPins,
        },

        "led-red": {
          label: "Red LED",
          tag: "wokwi-led",
          props: {
            color: "red",
          },
          pins: ledPins,
        },

        "ldr": {
        label: "LDR Sensor",
        tag: "wokwi-photoresistor-sensor",
        props: {},
        pins: ldrModulePins,
        },

        "pir": {
          label: "PIR Sensor",
          tag: "wokwi-pir-motion-sensor",
          props: {},
          pins: pirPins,
        },

        "ds1307": {
          label: "DS1307 RTC",
          tag: "wokwi-ds1307",
          props: {},
          pins: ds1307Pins,
        },

        "ssd1306": {
          label: "SSD1306 OLED",
          tag: "wokwi-ssd1306",
          props: {},
          pins: oledSsd1306SpiPins,
        },

        pushbutton: {
          label: "Push Button",
          tag: "wokwi-pushbutton",
          props: {},
          pins: pushbuttonPins,
        },

        potentiometer: {
          label: "Potentiometer",
          tag: "wokwi-potentiometer",
          props: {},
          pins: potentiometerPins,
        },

        "slide-switch": {
          label: "Slide Switch",
          tag: "wokwi-slide-switch",
          props: {},
          pins: slideSwitchPins,
        },

        "hc-sr04": {
          label: "HC-SR04",
          tag: "wokwi-hc-sr04",
          props: {},
          pins: hcsr04Pins,
        },

        lcd1602: {
          label: "LCD 1602",
          tag: "wokwi-lcd1602",
          props: {},
          pins: lcd1602Pins,
        },

        "lcd1602-i2c": {
          label: "LCD 1602 I2C",
          tag: "wokwi-lcd1602",
          props: {
            pins: "i2c",
          },
          pins: lcd1602I2cPins,
        },

        buzzer: {
          label: "Buzzer",
          tag: "wokwi-buzzer",
          props: {},
          pins: buzzerPins,
        },

        neopixel: {
          label: "NeoPixel",
          tag: "wokwi-neopixel",
          props: {},
          pins: neopixelPins,
        },

        "7segment": {
          label: "7 Segment",
          tag: "wokwi-7segment",
          props: {},
          pins: sevenSegmentPins,
        },

        "servo": {
          label: "Servo",
          tag: "wokwi-servo",
          props: {},
          pins: servoPins,
        },

        "membrane-keypad": {
          label: "Membrane Keypad",
          tag: "wokwi-membrane-keypad",
          props: {},
          pins: keypadPins,
        },

        "mini-board": {
          label: "Mini Breadboard",
          tag: "wokwi-mini-board",
          props: {},
          pins: miniBreadboardPins,
        },

        "half-board": {
          label: "Half Breadboard",
          tag: "wokwi-half-board",
          props: {},
          pins: halfBreadboardPins,
        },

        "full-board": {
          label: "Full Breadboard",
          tag: "wokwi-full-board",
          props: {},
          pins: fullBreadboardPins,
        },

        "raspberry-pico": {
          label: "Raspberry Pi Pico",
          tag: "wokwi-pico",
          props: {},
        },
        "battery-9v": {
          label: "9V Battery",
          tag: "wokwi-battery-9v",
          props: {},
          pins: batteryPins,
        },
      };

      const config =
        componentConfigs[type];

      if (!config) {
        console.warn(
          `Unknown component type: ${type}`
        );

        return;
      }

      /* ===================================================
         POSITION
      =================================================== */

      const position =
        reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

      /* ===================================================
         INSTANCE NUMBER
      =================================================== */

      const sameTypeNodes =
        nodesRef.current.filter(
          (node) =>
            node.data?.componentType ===
            type
        );

      const instanceNumber =
        sameTypeNodes.length + 1;

      /* ===================================================
         AUTO LABEL
      =================================================== */

      const autoLabel =
        `${config.label}-${instanceNumber}`;


      /* ===================================================
         NODE TYPE
      =================================================== */

      let customNodeType =
        "electronicNode";

      const isBreadboard =
        type === "mini-board" ||
        type === "half-board" ||
        type === "full-board" ||
        type === "battery-9v";

      if (
        type === "mini-board"
      ) {
        customNodeType =
          "breadboardMiniNode";
      }

      if (
        type === "half-board"
      ) {
        customNodeType =
          "breadboardHalfNode";
      }

      if (
        type === "full-board"
      ) {
        customNodeType =
          "breadboardFullNode";
      }

      if (
        type === "battery-9v"
      ) {
        customNodeType = "battery9VNode";
      }

      if (
        type === "pico"
      ) {
        customNodeType = "picoNode";
      }

      /* ===================================================
         CREATE NODE
      =================================================== */

      const newNode = {
        id: `${type}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,

        type: customNodeType,

        position,

        data: {
          componentType: type,

          tag: config.tag,

          props: { ...config.props },

          label: autoLabel,

          pins: config.pins || [],

          stubLength:
            config.stubLength || 5,

          instanceNumber,
        },

        zIndex: isBreadboard
          ? 0
          : 10,
      };

      const nextNodes = [
        ...nodesRef.current,
        newNode,
      ];

      // * console.log("This is NextNodes:", nextNodes);
      setNodes(nextNodes);

      pushToHistory(
        nextNodes,
        edgesRef.current
      );
    },
    [
      reactFlowInstance,
      setNodes,
      pushToHistory,
    ]
  );

  /* =======================================================
     RENAME
  ======================================================= */

  const handleRename = useCallback(
    (
      nodeId: string,
      newLabel: string
    ) => {
      const nextNodes =
        nodesRef.current.map(
          (node) => {
            if (node.id !== nodeId) {
              return node;
            }

            return {
              ...node,

              data: {
                ...node.data,

                label: newLabel,
              },
            };
          }
        );

      setNodes(nextNodes);

      const updatedSelectedNode =
        nextNodes.find(
          (node) =>
            node.id === nodeId
        );

      if (updatedSelectedNode) {
        setSelectedNode(
          updatedSelectedNode
        );
      }

      pushToHistory(
        nextNodes,
        edgesRef.current
      );
    },
    [setNodes, pushToHistory]
  );

  /* =======================================================
     EDGE CLICK
  ======================================================= */

  const onEdgeClick = useCallback(
    (
      event: React.MouseEvent,
      edge: Edge
    ) => {
      event.stopPropagation();

      setEdgeMenu({
        id: edge.id,

        x: event.clientX,

        y: event.clientY,

        color:
          typeof edge.style?.stroke ===
          "string"
            ? edge.style.stroke
            : "#2ecc71",
      });
    },
    []
  );

  /* =======================================================
     PANE CLICK
  ======================================================= */

  const onPaneClick = useCallback(() => {
    setEdgeMenu(null);

    setSelectedNode(null);
  }, []);

  /* =======================================================
     UPDATE EDGE COLOR
  ======================================================= */

  const updateEdgeColor = useCallback(
    (color: string) => {
      if (!edgeMenu) {
        return;
      }

      const nextEdges =
        edgesRef.current.map(
          (edge) => {
            if (
              edge.id !== edgeMenu.id
            ) {
              return edge;
            }

            return {
              ...edge,

              style: {
                ...edge.style,

                stroke: color,
              },
            };
          }
        );

      setEdges(nextEdges);

      pushToHistory(
        nodesRef.current,
        nextEdges
      );

      setEdgeMenu(null);
    },
    [
      edgeMenu,
      setEdges,
      pushToHistory,
    ]
  );

  /* =======================================================
     DELETE EDGE
  ======================================================= */

  const deleteEdge = useCallback(() => {
    if (!edgeMenu) {
      return;
    }

    const nextEdges =
      edgesRef.current.filter(
        (edge) =>
          edge.id !== edgeMenu.id
      );

    setEdges(nextEdges);

    pushToHistory(
      nodesRef.current,
      nextEdges
    );

    setEdgeMenu(null);
  }, [
    edgeMenu,
    setEdges,
    pushToHistory,
  ]);

  /* =======================================================
     DELETE NODE
  ======================================================= */

  const deleteNode = useCallback(
    (nodeId: string) => {
      const nextNodes =
        nodesRef.current.filter(
          (node) =>
            node.id !== nodeId
        );

      const nextEdges =
        edgesRef.current.filter(
          (edge) =>
            edge.source !== nodeId &&
            edge.target !== nodeId
        );

      setNodes(nextNodes);

      setEdges(nextEdges);

      if (
        selectedNode?.id === nodeId
      ) {
        setSelectedNode(null);
      }

      pushToHistory(
        nextNodes,
        nextEdges
      );
    },
    [
      selectedNode,
      setNodes,
      setEdges,
      pushToHistory,
    ]
  );

  /* =======================================================
     ROTATE NODE
  ======================================================= */

  const rotateNode = useCallback(
    (
      nodeId: string,
      rotation?: number
    ) => {
      let rotateNumber = 0;

      const nextNodes =
        nodesRef.current.map(
          (node) => {
            if (
              node.id !== nodeId
            ) {
              return node;
            }

            if (
              rotation !== undefined &&
              rotation !== null
            ) {
              rotateNumber =
                rotation;
            } else  {
              const currentRotation =
                node.data?.rotation || 0;

              if (
                currentRotation ===
                360
              ) {
                rotateNumber = 0;
              } else {
                rotateNumber =
                  currentRotation + 90;
              }
            }

            const updatedNode = {
              ...node,

              data: {
                ...node.data,

                rotation:
                  rotateNumber,
              },
            };

            if (
              selectedNode?.id ===
              nodeId
            ) {
              setSelectedNode(
                updatedNode
              );
            }

            return updatedNode;
          }
        );

      setNodes(nextNodes);

      pushToHistory(
        nextNodes,
        edgesRef.current
      );
    },
    [
      selectedNode,
      setNodes,
      pushToHistory,
    ]
  );

  /* =======================================================
     DEFAULT EDGE
  ======================================================= */

  const defaultEdgeOptions = {
    type: "smoothstep",

    zIndex: 1000,
  };

  /* =======================================================
     PLAY / STOP
  ======================================================= */

  const togglePlay = useCallback(
  async () => {
    if (
      simulationStatus ===
      "compiling"
    ) {
      handleStopSimulation();
      // handlePauseSimulation();
      return;
    }

    if (
      simulationStatus ===
      "running"
    ) {
      handleStopSimulation();
      return;
    }

    const hasFirmware =
      simulationCode.trim().length > 0;

    const success =
      hasFirmware
        ? await compile()
        : true;

    if (success) {
      /*
       * With code: compile -> HEX -> AVR8JS.
       * Without code: start the board power system only.
       */
      handleRunSimulation();
    }
  },
  [
    simulationStatus,
    simulationCode,
    compile,
    stop,
  ]
);

const toggleCode = useCallback(() => {
  setShowCode(!showCode);
}, [showCode]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">

      {/* ===================================================
          LEFT SIDEBAR
      =================================================== */}

      <Sidebar />

      {/* ===================================================
          MAIN CANVAS
      =================================================== */}

      <div
        ref={reactFlowWrapper}
        className="relative h-full flex-1"
      >

        {/* =================================================
            TOP TOOLBAR
        ================================================= */}

        <div className="absolute left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-300 bg-white/95 p-1.5 shadow-lg backdrop-blur">

          {/* Undo */}

          <button
            type="button"
            onClick={undo}
            disabled={history.index <= 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            title="Undo"
          >
            <Undo size={17} />
          </button>

          {/* Redo */}

          <button
            type="button"
            onClick={redo}
            disabled={
              history.index >=
              history.stack.length - 1
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            title="Redo"
          >
            <Redo size={17} />
          </button>

          <div className="mx-1 h-6 w-px bg-slate-200" />

          {/* Grid */}

          <button
            type="button"
            onClick={() =>
              setGrid((prev) => !prev)
            }
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
              grid
                ? "bg-slate-100 text-slate-900"
                : "text-slate-400 hover:bg-slate-100"
            }`}
            title="Toggle grid"
          >
            {grid ? (
              <LuGrid2X2X size={18} />
            ) : (
              <LuGrid2X2Plus size={18} />
            )}
          </button>

          {/* Rotate */}

          <button
            type="button"
            disabled={!selectedNode}
            onClick={() => {
              if (!selectedNode) {
                return;
              }

              rotateNode(
                selectedNode.id
              );
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            title="Rotate"
          >
            <FaArrowsRotate size={16} />
          </button>

          {/* Delete */}

          <button
            type="button"
            disabled={!selectedNode}
            onClick={() => {
              if (!selectedNode) {
                return;
              }

              deleteNode(
                selectedNode.id
              );
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
            title="Delete selected component"
          >
            <MdDeleteForever size={20} />
          </button>

          <div className="mx-1 h-6 w-px bg-slate-200" />

          <button
            type="button"
            onClick={toggleCode}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition bg-blue-500 text-white hover:bg-blue-600`}
            title="Code"
          >
            <LuCode />Code
          </button>

        <div className="mx-1 h-6 w-px bg-slate-200" />
          {/* Save */}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            title="Save circuit"
          >
            <FaRegSave size={16} />
          </button>

          {/* Play */}

          <button
            type="button"
            onClick={togglePlay}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
  simulationStatus === "running"
    ? "bg-red-50 text-red-600"
    : simulationStatus === "compiling"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-slate-900 text-white hover:bg-slate-800"
}`}
            title={
              simulationStatus === "running"
      ? "Stop simulation"
      : "Run simulation"
            }
          >
            {simulationStatus === "running"
              ? (
              <>
                <span className="text-xs">
                  Stop
                </span>
              </>
            ) : (
              <>
                <span className="text-xs">
                  Run
                </span>
              </>
            )}
          </button>

          
        </div>

        {/* =================================================
            REACT FLOW
        ================================================= */}

        <ReactFlow
          nodes={nodes}
          edges={edges}

          onNodesChange={
            onNodesChange
          }

          onEdgesChange={
            onEdgesChange
          }

          onConnect={onConnect}

          onInit={
            setReactFlowInstance
          }

          onDrop={onDrop}

          onDragOver={
            onDragOver
          }

          nodeTypes={nodeTypes}

          edgeTypes={edgeTypes}

          snapToGrid={true}

          snapGrid={[
            GRID_SIZE / 2,
            GRID_SIZE / 2,
          ]}

          onEdgeUpdate={
            onEdgeUpdate
          }

          onEdgeClick={
            onEdgeClick
          }

          onPaneClick={
            onPaneClick
          }

          connectionMode={
            ConnectionMode.Loose
          }

          onNodeDragStop={() => {
            pushToHistory(
              nodesRef.current,
              edgesRef.current
            );
          }}

          onNodeClick={(
            event,
            node
          ) => {
            event.stopPropagation();

            setSelectedNode(node);

            setEdgeMenu(null);
          }}

          fitView

          minZoom={0.5}

          maxZoom={12}

          defaultEdgeOptions={
            defaultEdgeOptions
          }
        >

          {/* ===============================================
              GRID
          =============================================== */}

          {grid && (
            <Background
              color="#e2e8f0"
              gap={GRID_SIZE}
              size={1}
              variant={
                BackgroundVariant.Lines
              }
            />
          )}

          {/* ===============================================
              DEFAULT CONTROLS
          =============================================== */}

          <Controls />

          {/* ===============================================
              CUSTOM ZOOM
          =============================================== */}

          <ZoomControls />

        </ReactFlow>

        {/* =================================================
            EDGE CONTEXT MENU
        ================================================= */}

        {edgeMenu && (
          <div
            className="fixed z-100 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
            style={{
              left: edgeMenu.x,
              top: edgeMenu.y,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Header */}

            <div className="mb-2 px-2 py-1 text-xs font-semibold text-slate-500">
              Wire
            </div>

            {/* Color Options */}

            <div className="grid grid-cols-5 gap-1 px-1 pb-2">

              {[
                "#2ecc71",
                "#2563eb",
                "#eab308",
                "#ef4444",
                "#000000",
                "#8b5cf6",
                "#ec4899",
                "#f97316",
                "#14b8a6",
                "#64748b",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    updateEdgeColor(
                      color
                    )
                  }
                  className="h-7 w-7 rounded-md border border-slate-200 transition hover:scale-110"
                  style={{
                    backgroundColor:
                      color,
                  }}
                  title={color}
                />
              ))}

            </div>

            {/* Delete */}

            <button
              type="button"
              onClick={deleteEdge}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              <MdDeleteForever
                size={17}
              />

              Delete wire
            </button>

            {/* Close */}

            <button
              type="button"
              onClick={() =>
                setEdgeMenu(null)
              }
              className="mt-1 flex w-full items-center justify-center rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-8 py-6 shadow-sm backdrop-blur">

              <div className="mb-2 text-sm font-semibold text-slate-600">
                Circuit Canvas
              </div>

              <div className="text-xs text-slate-400">
                Drag components from the
                sidebar to start building
                your circuit.
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          RIGHT PROPERTIES PANEL
      =================================================== */}

      <PropertiesPanel
        nodes={nodes}
        edges={edges}
        onRename={handleRename}
        rotateNode={rotateNode}
        onDelete={deleteNode}
        selectedNode={selectedNode}
        updateResistorValue={updateResistorValue}
      />

      {/* ===================================================
          CODE SECTION
      =================================================== */}

      <CodeSection show={showCode} setShow={setShowCode} />

    </div>

    
  );
};

export default CircuitEditor;