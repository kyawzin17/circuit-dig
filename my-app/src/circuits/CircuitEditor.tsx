import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
 addEdge,
 updateEdge,
 Background,
 BackgroundVariant,
 Controls,
 useNodesState,
 useEdgesState,
  ConnectionMode,
 type EdgeTypes,
 type Connection,
 type Edge,
 type ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import Sidebar from './Sidebar.tsx';
import ElectronicNode from './ElectronicNode.tsx';

// CircuitEditor.tsx အပေါ်ဆုံးမှာ Import လုပ်ပါ
import EditableEdge from './EditableEdge';

import PropertiesPanel from './PropertiesPanel';

import BreadboardMiniNode from './nodes/BreadboardMiniNode';
import BreadboardHalfNode from './nodes/BreadboardHalfNode.tsx';
import BreadboardFullNode from './nodes/BreadboardFullNode.tsx';



// ၁။ Error ပျောက်အောင် EdgeTypes ကို ဒီလို သတ်မှတ်ပါ
const edgeTypes: EdgeTypes = {
 editable: EditableEdge,
};

const nodeTypes = {
 electronicNode: ElectronicNode,
 breadboardMiniNode: BreadboardMiniNode,
 breadboardHalfNode: BreadboardHalfNode,
 breadboardFullNode: BreadboardFullNode,
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

 // ---  components ကို နှိပ်ရင် right side bar ပေါ်အောင်!
 const [selectedNode, setSelectedNode] = useState<any>(null);

 // ... အပေါ်က useState တွေရဲ့အောက်မှာ ထည့်ပါ ...
const [edgeMenu, setEdgeMenu] = useState<{ id: string, x: number, y: number, color: string } | null>(null);


const onConnect = useCallback((params: Connection | Edge) => {
 const strokeColor = getEdgeColor(params.sourceHandle || null);

 const newEdge = {
 ...params,
  type: 'editable', // ဒါကို ထည့်ဖို့ အရေးကြီးဆုံးပါ (ဒါမှ hover နဲ့ grid အလုပ်လုပ်မှာပါ)
  data: { points: null }, // initialization အတွက်
  style: {
  strokeWidth: 2,
  stroke: strokeColor,
 },
};

setEdges((eds) => addEdge(newEdge, eds));
}, [setEdges]);

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

const onDrop = useCallback(
  (event: React.DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = reactFlowInstance?.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Sidebar က အစိတ်အပိုင်းအလိုက် Tag နှင့် Props များ သတ်မှတ်ခြင်း
    const componentConfigs: Record<string, any> = {
      'mini-board': { label: 'Mini Board' },
      'half-board': { label: 'Half Board' },
      'full-board': { label: 'Full Board' },
      'arduino-uno': { tag: 'wokwi-arduino-uno', label: 'Arduino Uno' },
      'arduino-mega': { tag: 'wokwi-arduino-mega', label: 'Arduino Mega' },
      'arduino-nano': { tag: 'wokwi-arduino-nano', label: 'Arduino Nano' },
      'led-red': { tag: 'wokwi-led', props: { color: 'red' }, label: 'Red LED' },
      'led-green': { tag: 'wokwi-led', props: { color: 'green' }, label: 'Green LED' },
      'led-blue': { tag: 'wokwi-led', props: { color: 'blue' }, label: 'Blue LED' },
      'resistor': { tag: 'wokwi-resistor', props: { value: '1000' }, label: 'Resistor' },
      'pushbutton': { tag: 'wokwi-pushbutton', label: 'Pushbutton' },
      'potentiometer': { tag: 'wokwi-potentiometer', label: 'Potentiometer' },
      'slide-switch': { tag: 'wokwi-slide-switch', label: 'Slide Switch' },
      '7segment': { tag: 'wokwi-7segment', label: '7-Segment' },
      'lcd1602': { tag: 'wokwi-lcd1602', label: 'LCD 16x2' },
      'lcd1602-i2c': { tag: 'wokwi-lcd1602', props: { pins: 'i2c'}, label: 'LCD 16x2 (I2C)' },
      'neopixel': { tag: 'wokwi-neopixel', label: 'NeoPixel' },
      'buzzer': { tag: 'wokwi-buzzer', label: 'Buzzer' },
      'servo': { tag: 'wokwi-servo', label: 'Servo' },
      'hc-sr04': { tag: 'wokwi-hc-sr04', label: 'Ultrasonic Sensor HC-SR04' },
      'membrane-keypad': { tag: 'wokwi-membrane-keypad', label: 'Keypad Membrane' },

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
    
    const newNode = {
      id: `${type}-${Date.now()}`,
      type: customNodeType, // ကျွန်တော်တို့ ရေးခဲ့တဲ့ custom node type
      position,
      data: { 
        componentType: type,
        tag: config.tag, 
        props: config.props,
        label: config.label 
      },
      zIndex: isBreadboard ? 0 : 10,
    };

    setNodes((nds: any) => nds.concat(newNode));
  },
  [reactFlowInstance]
);

 // --- ကြိုးကို Click နှိပ်တဲ့အခါ Menu ပေါ်စေရန် ---
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
const rotateNode = (nodeId: string) => {
  setNodes((nds) =>
    nds.map((node) => {
      if (node.id === nodeId) {
        // လက်ရှိ rotation ရှိရင် +၉၀ ဒီဂရီ ပေါင်းမယ်၊ မရှိရင် ၉၀ က စမယ် (၃၆၀ ရောက်ရင် ၀ ပြန်ဖြစ်မယ်)
        const currentRotation = node.data.rotation || 0;
        const nextRotation = currentRotation + 90;
        
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            rotation: nextRotation,
          },
        };

        // PropertiesPanel မှာပါ ချက်ချင်း update ဖြစ်သွားအောင် SelectedNode State ကိုပါ လှမ်းချိန်းပေးရပါမယ်
        if (selectedNode && selectedNode.id === nodeId) {
          setSelectedNode(updatedNode);
        }

        return updatedNode;
      }
      return node;
    })
  );
};

 return (
   <div className="flex w-full bg-gray-100">
      
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
          
          onNodeClick={(event, node) => {
            setSelectedNode(node);
          }}
          fitView
          minZoom={0.5}
          maxZoom={12}
// အောက်က နှစ်ကြောင်းကို ထပ်ထည့်ပေးပါ
      defaultEdgeOptions={defaultEdgeOptions}
        >
          <Background color="#e2e8f0" gap={GRID_SIZE} size={1} variant={BackgroundVariant.Lines} />
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
        <PropertiesPanel selectedNode={selectedNode} onDelete={deleteNode} onRotate={rotateNode} />
      </div>
    </div>
  );
};

export default CircuitEditor;