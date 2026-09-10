import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

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

import Sidebar from "./Sidebar.tsx";
import ElectronicNode from "./ElectronicNode.tsx";

import { arduinoUnoPins } from "./pins/arduinoUnoPins.ts";
import { resistorPins } from "./pins/resistorPins.ts";

import {
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize,
  Check,
  Undo,
  Redo,
} from "lucide-react";

import { MdDeleteForever } from "react-icons/md";
import { FaRegSave } from "react-icons/fa";
import { FaArrowsRotate } from "react-icons/fa6";
import { LuGrid2X2X, LuGrid2X2Plus } from "react-icons/lu";

import EditableEdge from "./EditableEdge";
import PropertiesPanel from "./PropertiesPanel";

import BreadboardMiniNode from "./nodes/BreadboardMiniNode";
import BreadboardHalfNode from "./nodes/BreadboardHalfNode.tsx";
import BreadboardFullNode from "./nodes/BreadboardFullNode.tsx";
import PicoNode from "./nodes/Respberrypipico.tsx";

/* =========================================================
   TYPES
========================================================= */

type CircuitEdgeData = {
  points: unknown;

  sourceNodeId: string;
  sourcePinId: string | null;

  targetNodeId: string;
  targetPinId: string | null;
};

type CircuitEdge = Edge<CircuitEdgeData>;

/* =========================================================
   CONSTANTS
========================================================= */

const zoomLevels = [
  0.25,
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  2,
];

const GRID_SIZE = 10;

/* =========================================================
   EDGE TYPES
========================================================= */

const edgeTypes: EdgeTypes = {
  editable: EditableEdge,
};

/* =========================================================
   NODE TYPES
========================================================= */

const nodeTypes = {
  electronicNode: ElectronicNode,
  breadboardMiniNode: BreadboardMiniNode,
  breadboardHalfNode: BreadboardHalfNode,
  breadboardFullNode: BreadboardFullNode,
  picoNode: PicoNode,
};

/* =========================================================
   EDGE COLOR
========================================================= */

const getEdgeColor = (handleId: string | null) => {
  if (!handleId) {
    return "#2ecc71";
  }

  if (handleId.startsWith("digital")) {
    return "#2563eb";
  }

  if (handleId.startsWith("analog")) {
    return "#eab308";
  }

  if (handleId === "power_5v") {
    return "#ef4444";
  }

  if (handleId === "power_gnd") {
    return "#000000";
  }

  return "#2ecc71";
};

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

/* =========================================================
   ZOOM CONTROLS
========================================================= */

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

/* =========================================================
   MAIN COMPONENT
========================================================= */

const CircuitEditor = () => {
  /* =======================================================
     REFS
  ======================================================= */

  const reactFlowWrapper =
    useRef<HTMLDivElement>(null);

  const nodesRef = useRef<any[]>([]);
  const edgesRef = useRef<CircuitEdge[]>([]);

  /* =======================================================
     REACT FLOW STATE
  ======================================================= */

  const [nodes, setNodes, onNodesChange] =
    useNodesState([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState([]);

  const [
    reactFlowInstance,
    setReactFlowInstance,
  ] = useState<ReactFlowInstance | null>(null);

  /* =======================================================
     UI STATE
  ======================================================= */

  const [grid, setGrid] =
    useState<boolean>(true);

  const [play, setPlay] =
    useState<boolean>(false);

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
       * React Flow guarantees source and target
       * for a valid connection.
       *
       * Still guard here because our domain layer
       * requires both.
       */

      if (
        !params.source ||
        !params.target
      ) {
        return;
      }

      const strokeColor = getEdgeColor(
        params.sourceHandle ?? null
      );

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

              stroke: getEdgeColor(
                sourcePinId
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
        },

        resistor: {
          label: "Resistor",
          tag: "wokwi-resistor",
          props: {},
          pins: resistorPins,
        },

        "led-blue": {
          label: "Blue LED",
          tag: "wokwi-led-blue",
          props: {},
        },

        "led-green": {
          label: "Green LED",
          tag: "wokwi-led-green",
          props: {},
        },

        "led-red": {
          label: "Red LED",
          tag: "wokwi-led-red",
          props: {},
        },

        pushbutton: {
          label: "Push Button",
          tag: "wokwi-pushbutton",
          props: {},
        },

        potentiometer: {
          label: "Potentiometer",
          tag: "wokwi-potentiometer",
          props: {},
        },

        "slide-switch": {
          label: "Slide Switch",
          tag: "wokwi-slide-switch",
          props: {},
        },

        "hc-sr04": {
          label: "HC-SR04",
          tag: "wokwi-hc-sr04",
          props: {},
        },

        lcd1602: {
          label: "LCD 1602",
          tag: "wokwi-lcd1602",
          props: {},
        },

        "lcd1602-i2c": {
          label: "LCD 1602 I2C",
          tag: "wokwi-lcd1602-i2c",
          props: {},
        },

        buzzer: {
          label: "Buzzer",
          tag: "wokwi-buzzer",
          props: {},
        },

        neopixel: {
          label: "NeoPixel",
          tag: "wokwi-neopixel",
          props: {},
        },

        "7segment": {
          label: "7 Segment",
          tag: "wokwi-7segment",
          props: {},
        },

        servo: {
          label: "Servo",
          tag: "wokwi-servo",
          props: {},
        },

        "membrane-keypad": {
          label: "Membrane Keypad",
          tag: "wokwi-membrane-keypad",
          props: {},
        },

        "mini-board": {
          label: "Mini Breadboard",
          tag: "wokwi-mini-board",
          props: {},
        },

        "breadboard-mini": {
          label: "Mini Breadboard",
          tag: "wokwi-mini-board",
          props: {},
        },

        "breadboard-half": {
          label: "Half Breadboard",
          tag: "wokwi-breadboard-half",
          props: {},
        },

        "breadboard-full": {
          label: "Full Breadboard",
          tag: "wokwi-breadboard-full",
          props: {},
        },

        pico: {
          label: "Raspberry Pi Pico",
          tag: "wokwi-pico",
          props: {},
        },

        "raspberry-pi-pico": {
          label: "Raspberry Pi Pico",
          tag: "wokwi-pico",
          props: {},
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
        type === "breadboard-mini" ||
        type === "breadboard-half" ||
        type === "breadboard-full";

      if (
        type === "mini-board" ||
        type === "breadboard-mini"
      ) {
        customNodeType =
          "breadboardMiniNode";
      }

      if (
        type === "breadboard-half"
      ) {
        customNodeType =
          "breadboardHalfNode";
      }

      if (
        type === "breadboard-full"
      ) {
        customNodeType =
          "breadboardFullNode";
      }

      if (
        type === "pico" ||
        type === "raspberry-pi-pico"
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

          props: config.props,

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

  const togglePlay = useCallback(() => {
    setPlay((prev) => !prev);
  }, []);

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
              play
                ? "bg-red-50 text-red-600"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
            title={
              play
                ? "Stop simulation"
                : "Run simulation"
            }
          >
            {play ? (
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
      />
    </div>
  );
};

export default CircuitEditor;