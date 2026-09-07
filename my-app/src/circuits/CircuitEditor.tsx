import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
 addEdge,
 updateEdge,
 Background,
 BackgroundVariant,
 Controls,
 useNodesState,
 useEdgesState,
  ConnectionMode,
  useReactFlow,
 type EdgeTypes,
 type Connection,
 type Edge,
 type ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import Sidebar from './Sidebar.tsx';
import ElectronicNode from './ElectronicNode.tsx';

import { arduinoUnoPins } from './Pins/arduinoUnoPins.ts';
import { resistorPins } from './Pins/resistorPins.ts';


import {
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Check,
  Undo,
  Redo,
  
} from "lucide-react";


const zoomLevels = [
  0.25,
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  2,
];

import { MdDeleteForever } from "react-icons/md";
import { FaRegSave, FaPlay, FaStop } from "react-icons/fa";
import { FaArrowsRotate } from "react-icons/fa6";
import { LuGrid2X2X, LuGrid2X2Plus } from "react-icons/lu";

// CircuitEditor.tsx အပေါ်ဆုံးမှာ Import လုပ်ပါ
import EditableEdge from './EditableEdge';

import PropertiesPanel from './PropertiesPanel';

import BreadboardMiniNode from './nodes/BreadboardMiniNode';
import BreadboardHalfNode from './nodes/BreadboardHalfNode.tsx';
import BreadboardFullNode from './nodes/BreadboardFullNode.tsx';
import PicoNode from "./nodes/Respberrypipico.tsx";


// ၁။ Error ပျောက်အောင် EdgeTypes ကို ဒီလို သတ်မှတ်ပါ
const edgeTypes: EdgeTypes = {
 editable: EditableEdge,
};

const nodeTypes = {
 electronicNode: ElectronicNode,
 breadboardMiniNode: BreadboardMiniNode,
 breadboardHalfNode: BreadboardHalfNode,
 breadboardFullNode: BreadboardFullNode,
 picoNode: PicoNode,
};

const getEdgeColor = (handleId: string | null) => {
 if (!handleId) return '#2ecc71'; // Default Green
 if (handleId.startsWith('digital')) return '#2563eb'; // Blue if (handleId.startsWith('analog')) return '#eab308'; // Yellow
 if (handleId === 'power_5v') return '#ef4444';// Red
 if (handleId === 'power_gnd') return '#000000'; // Black
 return '#2ecc71';
};

const GRID_SIZE = 10;


//start CircuitEditor
const CircuitEditor = () => {
 const reactFlowWrapper = useRef<HTMLDivElement>(null);
 const [nodes, setNodes, onNodesChange] = useNodesState([]);
 const [edges, setEdges, onEdgesChange] = useEdgesState([]);
 const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

 const [ grid, setGrid ]= useState<boolean>(true);
  const [ play, setPlay ]= useState<boolean>(false);

  // --- ၁။ Undo/Redo ထိန်းချုပ်မည့် ပင်မ History State ---
const [history, setHistory] = useState<{
  stack: { nodes: any[]; edges: any[] }[];
  index: number;
}>({
  stack: [{ nodes: [], edges: [] }], // အစပြုချိန်မှာ အလွတ်သိမ်းထားမယ်
  index: 0,
});

// --- ၂။ Stale Closure (ကုဒ်ဟောင်းကျန်ခဲ့ခြင်း) မဖြစ်စေရန် လက်ရှိ State ကို အမြဲစောင့်ကြည့်မည့် Refs ---
const nodesRef = useRef(nodes);
const edgesRef = useRef(edges);
useEffect(() => {
  nodesRef.current = nodes;
  edgesRef.current = edges;
}, [nodes, edges]);

// --- ၃။ အပြောင်းအလဲတစ်ခုလုပ်ပြီးတိုင်း History ထဲ သိမ်းမည့် လုပ်ဆောင်ချက် ---
const pushToHistory = useCallback((newNodes: any[], newEdges: any[]) => {
  setHistory((prev) => {
    // အကယ်၍ Undo လုပ်ထားတဲ့အချိန်မှာ အသစ်ထပ်ထည့်ရင် အရှေ့က သမိုင်းကြောင်းကိုပဲ ဖြတ်ယူမယ်
    const cleanStack = prev.stack.slice(0, prev.index + 1);
    
    // React Flow ရဲ့ Object Reference ပြဿနာမတက်အောင် Deep Clone (Copy) ပွားပြီး သိမ်းပါမယ်
    const clonedNodes = JSON.parse(JSON.stringify(newNodes));
    const clonedEdges = JSON.parse(JSON.stringify(newEdges));

    return {
      stack: [...cleanStack, { nodes: clonedNodes, edges: clonedEdges }],
      index: cleanStack.length,
    };
  });
}, []);

// --- ၄။ Undo လုပ်ဆောင်ချက် ---
const undo = useCallback(() => {
  setHistory((prev) => {
    if (prev.index <= 0) return prev; // အစဆုံးရောက်နေရင် ဘာမှမလုပ်ဘူး
    const nextIndex = prev.index - 1;

    setNodes(prev.stack[nextIndex].nodes);
    setEdges(prev.stack[nextIndex].edges);
    return { ...prev, index: nextIndex };
  });
}, [setNodes, setEdges]);

// --- ၅။ Redo လုပ်ဆောင်ချက် ---
const redo = useCallback(() => {
  setHistory((prev) => {
    if (prev.index >= prev.stack.length - 1) return prev; // အဆုံးရောက်နေရင် ဘာမှမလုပ်ဘူး
    const nextIndex = prev.index + 1;

    setNodes(prev.stack[nextIndex].nodes);
    setEdges(prev.stack[nextIndex].edges);
    return { ...prev, index: nextIndex };
  });
}, [setNodes, setEdges]);

 // ---  components ကို နှိပ်ရင် right side bar ပေါ်အောင်!
 const [selectedNode, setSelectedNode] = useState<any>(null);

 // ... အပေါ်က useState တွေရဲ့အောက်မှာ ထည့်ပါ ...
const [edgeMenu, setEdgeMenu] = useState<{ id: string, x: number, y: number, color: string } | null>(null);


// const onConnect = useCallback((params: Connection | Edge) => {
//  const strokeColor = getEdgeColor(params.sourceHandle || null);

//  const newEdge = {
//  ...params,
//   type: 'editable', // ဒါကို ထည့်ဖို့ အရေးကြီးဆုံးပါ (ဒါမှ hover နဲ့ grid အလုပ်လုပ်မှာပါ)
//   data: { points: null }, // initialization အတွက်
//   style: {
//   strokeWidth: 2,
//   stroke: strokeColor,
//  },
// };
// setEdges((eds) => addEdge(newEdge, eds));
// }, [setEdges]);

const onConnect = useCallback((params: Connection | Edge) => {
  const strokeColor = getEdgeColor(params.sourceHandle || null);

  const newEdge = {
    ...params,
    type: 'editable', 
    data: { points: null }, 
    style: {
      strokeWidth: 2,
      stroke: strokeColor,
    },
  };

  // 🌟 ၁။ Refs တွေကိုသုံးပြီး လက်ရှိ Canvas ပေါ်က နောက်ဆုံးအခြေအနေကို လှမ်းယူပါမယ်
  const currentNodes = nodesRef.current;
  const currentEdges = edgesRef.current;

  // 🌟 ၂။ ကြိုးအဟောင်းတွေထဲကို ကြိုးအသစ် ပေါင်းထည့်မယ်
  const nextEdges = addEdge(newEdge, currentEdges);

  // 🌟 ၃။ React Flow ပေါ်မှာ ကြိုးပေါ်လာအောင် Update လုပ်မယ်
  setEdges(nextEdges);

  // 🌟 ၄။ History ထဲကို တိုက်ရိုက်လှမ်းသိမ်းမယ် (React Strict Mode ကြောင့် ၂ ခါမဝင်တော့ပါ)
  pushToHistory(currentNodes, nextEdges);

}, [setEdges, pushToHistory]); // Dependency ထဲမှာ ဒါလေး ၂ ခုပဲ ပါတာ သေချာပါစေ

//* Shortcuts for undo and redo
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Windows: Ctrl + Z , Mac: Cmd + Z
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
    }
    // Windows: Ctrl + Y , Mac: Cmd + Y
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);

// --- ကြိုးကို ဆွဲရွှေ့တဲ့အခါ ခေါ်မယ့် function (onEdgeUpdate) ---
 const onEdgeUpdate = useCallback(
 (oldEdge: Edge, newConnection: Connection) => {
 setEdges((eds) => updateEdge(oldEdge, newConnection, eds));
 },
 [setEdges]
 );


const onDragOver = useCallback((event: React.DragEvent) => {
 event.preventDefault();
 event.dataTransfer.dropEffect = 'move';
}, []);

// const onDrop = useCallback(
//   (event: React.DragEvent) => {
//     event.preventDefault();

//     const type = event.dataTransfer.getData('application/reactflow');
//     if (!type) return;

//     const position = reactFlowInstance?.screenToFlowPosition({
//       x: event.clientX,
//       y: event.clientY,
//     });

//     // Sidebar က အစိတ်အပိုင်းအလိုက် Tag နှင့် Props များ သတ်မှတ်ခြင်း
//     const componentConfigs: Record<string, any> = {
//       'mini-board': { label: 'Mini Board' },
//       'half-board': { label: 'Half Board' },
//       'full-board': { label: 'Full Board' },
//       'arduino-uno': { tag: 'wokwi-arduino-uno', label: 'Arduino Uno' },
//       'arduino-mega': { tag: 'wokwi-arduino-mega', label: 'Arduino Mega' },
//       'arduino-nano': { tag: 'wokwi-arduino-nano', label: 'Arduino Nano' },
//       'led-red': { tag: 'wokwi-led', props: { color: 'red' }, label: 'Red LED' },
//       'led-green': { tag: 'wokwi-led', props: { color: 'green' }, label: 'Green LED' },
//       'led-blue': { tag: 'wokwi-led', props: { color: 'blue' }, label: 'Blue LED' },
//       'resistor': { tag: 'wokwi-resistor', props: { value: '1000' }, label: 'Resistor' },
//       'pushbutton': { tag: 'wokwi-pushbutton', label: 'Pushbutton' },
//       'potentiometer': { tag: 'wokwi-potentiometer', label: 'Potentiometer' },
//       'slide-switch': { tag: 'wokwi-slide-switch', label: 'Slide Switch' },
//       '7segment': { tag: 'wokwi-7segment', label: '7-Segment' },
//       'lcd1602': { tag: 'wokwi-lcd1602', label: 'LCD 16x2' },
//       'lcd1602-i2c': { tag: 'wokwi-lcd1602', props: { pins: 'i2c'}, label: 'LCD 16x2 (I2C)' },
//       'neopixel': { tag: 'wokwi-neopixel', label: 'NeoPixel' },
//       'buzzer': { tag: 'wokwi-buzzer', label: 'Buzzer' },
//       'servo': { tag: 'wokwi-servo', label: 'Servo' },
//       'hc-sr04': { tag: 'wokwi-hc-sr04', label: 'Ultrasonic Sensor HC-SR04' },
//       'membrane-keypad': { tag: 'wokwi-membrane-keypad', label: 'Keypad Membrane' },

//       // ... ကျန်တဲ့ ၂၀ လုံးကို ဒီမှာ ထည့်ပေးပါ
//     };

//     const config = componentConfigs[type] || { tag: 'wokwi-led', label: 'Unknown' };

//     let customNodeType = 'electronicNode';
//     let isBreadboard = false;

//     if (type === 'mini-board') {
//       customNodeType = 'breadboardMiniNode';
//       isBreadboard = true;
//     }
//     else if (type === 'half-board') {
//       customNodeType = 'breadboardHalfNode';
//       isBreadboard = true;
//     }
//     else if (type === 'full-board') {
//       customNodeType = 'breadboardFullNode';
//       isBreadboard = true;
//     }
    
//     const newNode = {
//       id: `${type}-${Date.now()}`,
//       type: customNodeType, // ကျွန်တော်တို့ ရေးခဲ့တဲ့ custom node type
//       position,
//       data: { 
//         componentType: type,
//         tag: config.tag, 
//         props: config.props,
//         label: config.label 
//       },
//       zIndex: isBreadboard ? 0 : 10,
//     };

//     setNodes((nds: any) => nds.concat(newNode));
//   },
//   [reactFlowInstance]
// );

 // --- ကြိုးကို Click နှိပ်တဲ့အခါ Menu ပေါ်စေရန် ---
 const onDrop = useCallback(
  (event: React.DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    // reactFlowInstance မရှိသေးရင် error မတက်အောင် စစ်ပေးထားပါတယ်
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Sidebar က အစိတ်အပိုင်းအလိုက် Tag နှင့် Props များ သတ်မှတ်ခြင်း
    const componentConfigs: Record<string, any> = {
      'mini-board': { label: 'Mini Board', stubLength: 0 },
      'half-board': { label: 'Half Board', stubLength: 0 },
      'full-board': { label: 'Full Board', stubLength: 0 },
      'arduino-uno': {
  tag: 'wokwi-arduino-uno',

  label: 'Arduino Uno',

  stubLength: 15,

  pins: arduinoUnoPins,
},
      'arduino-mega': { tag: 'wokwi-arduino-mega', label: 'Arduino Mega', stubLength: 15 },
      'arduino-nano': { tag: 'wokwi-arduino-nano', label: 'Arduino Nano', stubLength: 15 },
      'respberry-pico': { label: "Raspberry Pi Pico", stubLength: 15 },
      'led-red': { tag: 'wokwi-led', props: { color: 'red' }, label: 'Red LED', stubLength: 15 },
      'led-green': { tag: 'wokwi-led', props: { color: 'green' }, label: 'Green LED', stubLength: 15 },
      'led-blue': { tag: 'wokwi-led', props: { color: 'blue' }, label: 'Blue LED', stubLength: 15 },
      'resistor': {
  tag: 'wokwi-resistor',

  props: {
    value: '1000',
  },

  label: 'Resistor',

  stubLength: 15,

  pins: resistorPins,
},
      'pushbutton': { tag: 'wokwi-pushbutton', label: 'Pushbutton', stubLength: 15 },
      'potentiometer': { tag: 'wokwi-potentiometer', label: 'Potentiometer', stubLength: 15 },
      'slide-switch': { tag: 'wokwi-slide-switch', label: 'Slide Switch', stubLength: 15 },
      '7segment': { tag: 'wokwi-7segment', label: '7-Segment', stubLength: 15 },
      'lcd1602': { tag: 'wokwi-lcd1602', label: 'LCD 16x2', stubLength: 15 },
      'lcd1602-i2c': { tag: 'wokwi-lcd1602', props: { pins: 'i2c'}, label: 'LCD 16x2 (I2C)', stubLength: 15 },
      'neopixel': { tag: 'wokwi-neopixel', label: 'NeoPixel', stubLength: 15 },
      'buzzer': { tag: 'wokwi-buzzer', label: 'Buzzer', stubLength: 15 },
      'servo': { tag: 'wokwi-servo', label: 'Servo', stubLength: 15 },
      'hc-sr04': { tag: 'wokwi-hc-sr04', label: 'Ultrasonic Sensor HC-SR04', stubLength: 15 },
      'membrane-keypad': { tag: 'wokwi-membrane-keypad', label: 'Keypad Membrane', stubLength: 15 },
      'rgb-led': { tag: 'wokwi-rgb-led', label: 'RGB Led', stubLength: 15 },
      'stepper-motor': { tag: 'wokwi-stepper-motor', label: 'Stepper Motor', stubLength: 15 },
      'ldr': { tag: 'wokwi-photoresistor-sensor', label: 'LDR Sensor', stubLength: 15 },
      'pir': { tag: 'wokwi-pir-motion-sensor', label: 'PIR Motion Sensor', stubLength: 15 },
      'ds1307': { tag: 'wokwi-ds1307', label: 'RTC DS1307', stubLength: 15 },
      'ssd1306': { tag: 'wokwi-ssd1306', label: 'OLED SSD1306', stubLength: 15 },
      'joystick': { tag: 'wokwi-analog-joystick', label: 'Joystick', stubLength: 15 },
      'esp32': { tag: 'wokwi-esp32-devkit-v1', label: 'ESP32 DevKit', stubLength: 15 },
      // ... ကျန်တဲ့ ၂၀ လုံးကို ဒီမှာ ထည့်ပေးပါ
    };

    const config = componentConfigs[type] || { tag: 'wokwi-led', label: 'Unknown' };

    let customNodeType = 'electronicNode';
    let isBreadboard = false;

    if (type === 'mini-board') {
      customNodeType = 'breadboardMiniNode';
      isBreadboard = true;
    }
    else if (type === 'half-board') {
      customNodeType = 'breadboardHalfNode';
      isBreadboard = true;
    }
    else if (type === 'full-board') {
      customNodeType = 'breadboardFullNode';
      isBreadboard = true;
    }
    else if (type === 'respberry-pico') {
      customNodeType = 'picoNode';
      isBreadboard = true;
    }
     const currentNodes = nodesRef.current;

     // =====================================
    // SAME COMPONENT COUNT
    // =====================================

    const sameComponentNodes =
      currentNodes.filter(
        (node) =>
          node.data?.componentType === type
      );

    const instanceNumbers =
  sameComponentNodes.map(
    (node) =>
      node.data?.instanceNumber ?? -1
  );

const instanceNumber =
  instanceNumbers.length > 0
    ? Math.max(...instanceNumbers) + 1
    : 0;

    // =====================================
    // AUTO NAME
    // =====================================

    const autoLabel =
      `${config.label}-${instanceNumber}`;

    // =====================================
    // NEW NODE
    // =====================================

    const newNode = {
      id: `${type}-${Date.now()}`,
      type: customNodeType, 
      position,
      data: { 
        componentType: type,
        tag: config.tag, 
        props: config.props,
        label: autoLabel,
        pins: config.pins || [],
        stubLength: config.stubLength || 5,
        instanceNumber: instanceNumber,
      },
      zIndex: isBreadboard ? 0 : 10,
    };

    // 🌟 History အတွက် ပြင်ဆင်ထားသော အပိုင်း 🌟
   
    const nextNodes = [...currentNodes, newNode];
    
    // ၁။ Canvas ပေါ်မှာ Component အသစ်ပေါ်လာအောင် update လုပ်မယ်
    setNodes(nextNodes);
    
    // ၂။ Canvas ထဲ ချချချင်း History ထဲ တန်းမှတ်မယ်
    pushToHistory(nextNodes, edgesRef.current);

  },
  [reactFlowInstance, setNodes, pushToHistory] // 🌟 Dependency တွေ စနစ်တကျ ထည့်ပေးထားပါတယ်
);

const handleRename = (
  nodeId: string,
  newName: string
) => {

  const currentNodes =
    nodesRef.current;

  const nextNodes =
    currentNodes.map((node) => {

      if (node.id === nodeId) {
        return {
          ...node,

          data: {
            ...node.data,

            label: newName,
          },
        };
      }

      return node;
    });

  setNodes(nextNodes);

  pushToHistory(
    nextNodes,
    edgesRef.current
  );
};

 const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
 event.stopPropagation(); // Canvas ကိုပါ နှိပ်မိသလို မဖြစ်အောင် တားထားခြင်း
 if (reactFlowWrapper.current) {
 const bounds = reactFlowWrapper.current.getBoundingClientRect();
 setEdgeMenu({
 id: edge.id,
 x: event.clientX - bounds.left,
 y: event.clientY - bounds.top,
  color: edge.style?.stroke?.toString() || '#2ecc71',
 });
}
 }, []);

// --- အပြင် (Canvas) ကို နှိပ်မိရင် Menu ပြန်ဖျောက်ရန် ---
 const onPaneClick = useCallback(() => {
  setEdgeMenu(null);
  setSelectedNode(null);
 }, []);

 // --- ကြိုးအရောင် ပြောင်းရန် ---
 const updateEdgeColor = (color: string) => {
   if (!edgeMenu) return;
   setEdges((eds) =>
 eds.map((e) =>
 e.id === edgeMenu.id ? { ...e, style: { ...e.style, stroke: color } } : e
 )
 );
  // Menu ပေါ်က အရောင်ကိုပါ ချက်ချင်း Update လုပ်ပေးရန်
 //  setEdgeMenu((prev) => (prev ? { ...prev, color } : null)); 
 };

 // --- ကြိုး ဖြုတ်ရန် (Delete Edge) ---
 const deleteEdge = () => {
   if (!edgeMenu) return;
   setEdges((eds) => eds.filter((e) => e.id !== edgeMenu.id));
   setEdgeMenu(null); // ဖျက်ပြီးရင် Menu ကို ဖျောက်ပါ
 };

// ဆက်သွားပြီးရင် မြင်ရမယ့် ကြိုးရဲ့ Setting များ
const defaultEdgeOptions = {
  type: 'smoothstep',  // ကြိုးပုံစံ (straight, step, smoothstep, default)
  zIndex: 1000,        // 🌟 အရေးကြီးဆုံး: Component တွေရဲ့ အပေါ်ကို ရောက်လာစေဖို့
};

const deleteNode = (nodeId: string) => {
  setNodes((nds) => nds.filter((n) => n.id !== nodeId));

  // အဲ့ node နဲ့ ဆက်ထားတဲ့ wires တွေပါ ဖျက်
  setEdges((eds) =>
    eds.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    )
  );

  setSelectedNode(null);
};

// Node ကို လှည့်ပေးမယ့် function အသစ်
// const rotateNode = (nodeId: string) => {
//   setNodes((nds) =>
//     nds.map((node) => {
//       if (node.id === nodeId) {
//         // လက်ရှိ rotation ရှိရင် +၉၀ ဒီဂရီ ပေါင်းမယ်၊ မရှိရင် ၉၀ က စမယ် (၃၆၀ ရောက်ရင် ၀ ပြန်ဖြစ်မယ်)
//         const currentRotation = node.data.rotation || 0;
//         const nextRotation = currentRotation + 90;
        
//         const updatedNode = {
//           ...node,
//           data: {
//             ...node.data,
//             rotation: nextRotation,
//           },
//         };

//         // PropertiesPanel မှာပါ ချက်ချင်း update ဖြစ်သွားအောင် SelectedNode State ကိုပါ လှမ်းချိန်းပေးရပါမယ်
//         if (selectedNode && selectedNode.id === nodeId) {
//           setSelectedNode(updatedNode);
//         }
//       }
//       return node;
//     })
//   );
  
// };

let rotateNumber;
const rotateNode = useCallback((nodeId: string, rotation?: number) => {
  // ၁။ State update မလုပ်ခင် nodes array အသစ်ကို အရင် ပတ်ပြီး ရှာပါမယ်
  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId) {

      if (rotation) {
        rotateNumber = rotation;
        console.log(`Rotation is defined, using provided rotation: ${rotation}`);
      } else {
        console.log("Rotation is undefined, using current rotation.");
      const currentRotation = node.data.rotation || 0;
      // 🌟 ၃၆၀ ဒီဂရီပြည့်ရင် ၀ ပြန်ဖြစ်သွားအောင် % 360 ပါ တစ်ခါတည်း ထည့်ပေးထားပါတယ်
      if (currentRotation === 360) {
        rotateNumber = 0;
      } else {
        const nextRotation = currentRotation + 90; 
        rotateNumber = nextRotation;
      }
    }
      
      const updatedNode = {
        ...node,
        data: {
          ...node.data,
          rotation: rotateNumber,
        },
      };

      // PropertiesPanel မှာပါ ချက်ချင်း update ဖြစ်သွားအောင် SelectedNode ဆောက်မယ်
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(updatedNode);
      }

      return updatedNode; // 🌟 [BUG FIX] လှည့်ထားတဲ့ Node အသစ်ကို Return ပြန်ပေးရပါမယ်
    }
    return node; // မသက်ဆိုင်တဲ့ တခြား node တွေကို ဒီအတိုင်း ထားခဲ့မယ်
  });

  // ၂။ Canvas ပေါ်က Node တွေကို အရွှေ့အပြောင်း လုပ်မယ်
  setNodes(nextNodes);

  // ၃။ 🌟 လှည့်ပြီးသွားတဲ့ အခြေအနေသစ်ကို Undo/Redo History ထဲ လှမ်းသိမ်းလိုက်ပါပြီ
  pushToHistory(nextNodes, edgesRef.current);

}, [nodes, selectedNode, setNodes, pushToHistory]); // 🌟 Dependency များကို စနစ်တကျ ထည့်သွင်းထားပါတယ်

// ! Zoom Controls Component
const ZoomControls = () => {
  const {
    zoomIn,
    zoomOut,
    setViewport,
    getViewport,
    getZoom,
    fitView,
  } = useReactFlow();


  const [isOpen, setIsOpen] =
    useState(false);


  // UI မှာပြမယ့် zoom
  const [zoom, setZoom] =
    useState(() => getZoom());


  // ----------------------------
  // SET ZOOM
  // ----------------------------

  const handleSetZoom = (
    zoomLevel: number
  ) => {

    const viewport =
      getViewport();

    setViewport(
      {
        x: viewport.x,
        y: viewport.y,
        zoom: zoomLevel,
      },
      {
        duration: 200,
      }
    );

    setZoom(zoomLevel);

    setIsOpen(false);
  };


  // ----------------------------
  // ZOOM IN
  // ----------------------------

  const handleZoomIn = async () => {

    await zoomIn({
      duration: 200,
    });

    setZoom(getZoom());
  };


  // ----------------------------
  // ZOOM OUT
  // ----------------------------

  const handleZoomOut = async () => {

    await zoomOut({
      duration: 200,
    });

    setZoom(getZoom());
  };


  // ----------------------------
  // FIT VIEW
  // ----------------------------

  const handleFitView = async () => {

    await fitView({
      duration: 300,
      padding: 0.2,
    });

    setZoom(getZoom());

    setIsOpen(false);
  };


  // ----------------------------
  // RESET
  // ----------------------------

  const handleResetZoom = () => {

    const viewport =
      getViewport();

    setViewport(
      {
        x: viewport.x,
        y: viewport.y,
        zoom: 1,
      },
      {
        duration: 200,
      }
    );

    setZoom(1);

    setIsOpen(false);
  };


  return (
    <div className="relative">

      {/* =====================
          MAIN TOOLBAR
      ===================== */}

      <div
        className="
          flex
          items-center
          h-9
          bg-[#111b2b]
          border
          border-[#26364d]
          rounded-md
          shadow-md
          overflow-hidden
        "
      >

        {/* Zoom Percentage */}

        <button
          onClick={() =>
            setIsOpen(!isOpen)
          }
          className="
            flex
            items-center
            gap-2
            h-full
            px-3
            text-xs
            font-semibold
            text-slate-200
            border-r
            border-[#26364d]
            hover:bg-[#17243a]
            transition
          "
        >

          {Math.round(zoom * 100)}%

          <ChevronDown
            size={13}
            className={`
              transition-transform
              ${isOpen ? "rotate-180" : ""}
            `}
          />

        </button>


        {/* Zoom Out */}

        <button
          onClick={handleZoomOut}
          className="
            w-9
            h-full
            flex
            items-center
            justify-center
            text-slate-400
            hover:text-white
            hover:bg-[#17243a]
            transition
          "
        >
          <ZoomOut size={15} />
        </button>


        {/* Zoom In */}

        <button
          onClick={handleZoomIn}
          className="
            w-9
            h-full
            flex
            items-center
            justify-center
            text-slate-400
            hover:text-white
            hover:bg-[#17243a]
            transition
          "
        >
          <ZoomIn size={15} />
        </button>

      </div>


      {/* =====================
          DROPDOWN
      ===================== */}

      {isOpen && (

        <div
          className="
            absolute
            top-full
            left-0
            mt-2
            w-40
            bg-[#111b2b]
            border
            border-[#26364d]
            rounded-md
            shadow-xl
            overflow-hidden
            z-9999
          "
        >

          {/* Zoom Levels */}

          {zoomLevels.map(
            (level) => {

              const percentage =
                level * 100;

              const isActive =
                Math.round(zoom * 100) ===
                percentage;


              return (

                <button
                  key={level}

                  onClick={() =>
                    handleSetZoom(level)
                  }

                  className={`
                    w-full
                    flex
                    items-center
                    justify-between
                    px-4
                    py-2
                    text-left
                    text-sm
                    transition

                    ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : `
                          text-slate-300
                          hover:bg-[#17243a]
                          hover:text-white
                        `
                    }
                  `}
                >

                  {percentage}%

                  {isActive && (
                    <Check size={15} />
                  )}

                </button>

              );

            }
          )}


          {/* Divider */}

          <div className="h-px bg-[#26364d] my-1" />


          {/* Fit View */}

          <button
            onClick={handleFitView}
            className="
              w-full
              flex
              items-center
              gap-2
              px-4
              py-2
              text-sm
              text-slate-300
              hover:bg-[#17243a]
              hover:text-white
              transition
            "
          >

            <Maximize size={15} />

            Fit View

          </button>


          {/* Reset Zoom */}

          <button
            onClick={handleResetZoom}
            className="
              w-full
              flex
              items-center
              gap-2
              px-4
              py-2
              text-sm
              text-slate-300
              hover:bg-[#17243a]
              hover:text-white
              transition
            "
          >

            <RotateCcw size={15} />

            Reset Zoom

          </button>

        </div>

      )}

    </div>
  );
}

 return (
   <div className="flex w-full bg-gray-100 font-monospace">
      
      <header className="w-full h-12 bg-[#0D1B31] flex items-center justify-between px-4 md:px-12 absolute top-0 left-0 z-100 shadow-[0_2px_4px_rgba(255,255,255,0.2)]">
              <h3 className="font-bold font-serif text-white text-2xl">Circuit Editor</h3>
              

              <div className="flex gap-4 items-center">
                  <div className="flex items-center rounded-md border border-slate-700 bg-[#111b2b] shadow-lg overflow-hidden">
                    {/* //? Undo Mode! */}
                    <div className="relative group h-full inline-block">
                      <button onClick={() => undo()}
                      disabled={history.index <= 0}
                      className={`cursor-pointer w-8
                          h-8
                          flex
                          items-center
                          justify-center
                          transition-colors
                      ${
                          history.index <= 0 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-100 hover:bg-slate-800'
                        }`}
                        title="Undo (Ctrl+Z)"
                        >
                        <Undo size={20} className="font-bold"  />
                      </button>
                      {/* <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">Undo</span> */}
                    </div>

                    <div className="w-px h-6 bg-slate-700 rounded-full"></div>

                {/* //? Redo Mode! */}
                    <div className="relative group h-full inline-block">
                      <button onClick={() => redo()}
                      disabled={history.index >= history.stack.length - 1}
                      className={`cursor-pointer w-8
                                    h-8
                                    flex
                                    items-center
                                    justify-center
                                    transition-colors
                      ${
                        history.index >= history.stack.length - 1
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-100 hover:bg-slate-800'
                        }`}
                        title="Redo (Ctrl+Y)"
                        >
                        <Redo size={20} />
                      </button>
                      {/* <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">Redo</span> */}
                    </div>
                  </div>

                  <ZoomControls />

                  {/* //? Grid Mode! */}
                <div className="relative group inline-block">
                  <button onClick={() => {
                    setGrid(!grid)
                  }} className="text-white h-8 w-8 cursor-pointer flex items-center justify-center rounded-md hover:bg-slate-400/20 transition-colors">
                    { grid ? 
                      <LuGrid2X2X size={20} />
                    : 
                      <LuGrid2X2Plus size={20} />
                    }
                  </button>
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">{ grid ? "Grid Remove" : "Grid Add" }</span>
                </div>

              </div>


              <div className="flex gap-2.5 items-center">

            {/* //? Play Mode! */}
                {/* <div className="relative group inline-block">
                  <button onClick={() => {
                    setPlay(!play)
                  }} className="text-white cursor-pointer text-xl p-2 rounded-full hover:bg-slate-400 transition-colors">
                    { play ? 
                      <FaPlay />
                    : 
                      <FaStop />
                    }
                  </button>
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">{ play ? "Play" : "Stop" }</span>
                </div> */}

            

            {/* //? Rotate Mode! */}
                <div className="relative group inline-block">
                  <button disabled={!selectedNode} // Node ရွေးထားမှ အလုပ်လုပ်မယ်
                          onClick={() => 
                                        selectedNode && rotateNode(selectedNode.id, 0)
                                      }
                                      className={`${selectedNode ? "text-gray-100 hover:bg-slate-800" : "text-gray-400"} cursor-pointer h-8 w-8 flex items-center justify-center rounded-md transition-colors`}
                           title="Rotate">
                    <FaArrowsRotate size={20} />
                  </button>
                  {/* <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">Rotate</span> */}
                </div>

            
            {/* //? Delete Mode! */}
                <div className="relative group inline-block">
                  <button disabled={!selectedNode} // Node ရွေးထားမှ အလုပ်လုပ်မယ်
                          onClick={() => selectedNode && deleteNode(selectedNode.id)}
                   className={`cursor-pointer h-8 w-8 flex items-center justify-center rounded-md transition-colors
                   ${
                     !selectedNode
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-500 hover:bg-slate-800'
                    }`}
                    title="Delete"
                    >
                    <MdDeleteForever size={20} />
                  </button>
                  {/* <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">Redo</span> */}
                </div>

            {/* //? Save Mode! */}
                <div className="relative group h-8 flex items-center justify-center px-1.5 inline-blockbg-[#0A162A]/90 border border-slate-400/30 backdrop-blur-md rounded-md">
                  <button disabled={history.index <= 2}
                           className={`cursor-pointer flex items-center gap-2 rounded-md transition-colors
                   ${
                     history.index <= history.stack.length - 1
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-100 hover:bg-slate-800'
                    }`}
                    title="Save">
                    <FaRegSave size={20} />
                    <span className="text-md text-white/80 font-bold p-0">Save</span>
                  </button>
                  {/* <span className="absolute top-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">Save</span> */}
                </div>
                
              </div>

      </header>

     <Sidebar />

      {/* Editor Canvas Area */}
      <div className="flex-1 relative bg-white" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          snapToGrid={true} // Grid ပေါ်မှာပဲ ရွှေ့ခွင့်ပေးမယ်
          snapGrid={[GRID_SIZE / 2, GRID_SIZE / 2]} // X နဲ့ Y ကို 10px စီ snap လုပ်မယ်
          onEdgeUpdate={onEdgeUpdate} // Props အသစ်ထည့်ပါ
          onEdgeClick={onEdgeClick} // ထပ်တိုး
          onPaneClick={onPaneClick} // ထပ်တိုး
          connectionMode={ConnectionMode.Loose}
          onNodeDragStop={() => pushToHistory(nodesRef.current, edgesRef.current)} //! circuit ဆက်လို့ တစ်ခါပြီးရင် တစ်ခါမှတ်
          onNodeClick={(event, node) => {
            setSelectedNode(node);
          }}
          fitView
          minZoom={0.5}
          maxZoom={12}
// အောက်က နှစ်ကြောင်းကို ထပ်ထည့်ပေးပါ
      defaultEdgeOptions={defaultEdgeOptions}
        >
          {grid && <Background color="#e2e8f0" gap={GRID_SIZE} size={1} variant={BackgroundVariant.Lines} />}
          <Controls />
        </ReactFlow>
        {/* --- Floating Edge Edit Menu (ကြိုးပြင်ဆင်ရန် UI) --- */}
        {edgeMenu && (
          <div
            className="absolute z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 flex flex-col gap-3 w-48"
            style={{ top: edgeMenu.y, left: edgeMenu.x }}
          >
            <div className="text-xs font-bold text-gray-500 border-b pb-2">ကြိုး ပြင်ဆင်ရန်</div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700 font-medium">အရောင်ရွေးပါ</label>
              <input
                type="color"
                value={edgeMenu.color}
                onChange={(e) => updateEdgeColor(e.target.value)}
                className="w-8 h-8 cursor-pointer rounded border-0 p-0"
              />
            </div>

            <button
              onClick={deleteEdge}
              className="mt-2 w-full bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 text-sm py-1.5 px-3 rounded-lg transition-colors font-medium"
            >
              ကြိုးဖြုတ်မည်
            </button>
          </div>
        )}
        <PropertiesPanel nodes={nodes} edges={edges} onRename={handleRename} rotateNode={rotateNode} onDelete={deleteNode} selectedNode={selectedNode} />
      </div>
    </div>
  );
};

export default CircuitEditor;

