import React, { useState, useEffect } from 'react';
import '@wokwi/elements';
import { HiArrowLeftOnRectangle } from "react-icons/hi2";
import { HiArrowRightEndOnRectangle } from "react-icons/hi2";
import "./circuit.css"
import miniBoard from "../assets/gemini-svg (1).svg";
import halfBoard from "../assets/gemini-svg (2).svg";
import fullBoard from "../assets/gemini-svg (3).svg";


const Sidebar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [leftSidebar, setLeftSidebar]= useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // --- အစိတ်အပိုင်း ၂၀ စာရင်း ---
  const allComponents = [
    { type: "mini-board", name: "Mini Board", tag: "wokwi-mini-board", props: {}, scale: 0.5, yOffset: '-15px' },
    { type: "half-board", name: "Half Board", tag: "wokwi-half-board", props: {}, scale: 0.5, yOffset: '-15px' },
    { type: "full-board", name: "Full Board", tag: "wokwi-full-board", props: {}, scale: 0.5, yOffset: '-15px' },
    { type: 'arduino-uno', name: 'Arduino Uno', tag: 'wokwi-arduino-uno', props: {}, scale: 0.2, yOffset: '-15px' },
    { type: 'arduino-mega', name: 'Arduino Mega', tag: 'wokwi-arduino-mega', props: {}, scale: 0.2, yOffset: '-10px' },
    { type: 'arduino-nano', name: 'Arduino Nano', tag: 'wokwi-arduino-nano', props: {}, scale: 0.3, yOffset: '0px' },
    { type: 'respberry-pico', name: "Raspberry Pi Pico", tag: "wokwi-respberrypico", props: {}, scale: 0.3, yOffset: '0px' },
    { type: 'led-red', name: 'Red LED', tag: 'wokwi-led', props: { color: 'red' }, scale: 0.8, yOffset: '0px' },
    { type: 'led-green', name: 'Green LED', tag: 'wokwi-led', props: { color: 'green' }, scale: 0.8, yOffset: '0px' },
    { type: 'led-blue', name: 'Blue LED', tag: 'wokwi-led', props: { color: 'blue' }, scale: 0.8, yOffset: '0px' },
    { type: 'resistor', name: 'Resistor', tag: 'wokwi-resistor', props: { value: '1000' }, scale: 0.8, yOffset: '0px' },
    { type: 'pushbutton', name: 'Pushbutton', tag: 'wokwi-pushbutton', props: { color: 'red' }, scale: 0.5, yOffset: '0px' },
    { type: 'potentiometer', name: 'Potentiometer', tag: 'wokwi-potentiometer', props: {}, scale: 0.4, yOffset: '0px' },
    { type: 'slide-switch', name: 'Slide Switch', tag: 'wokwi-slide-switch', props: {}, scale: 0.8, yOffset: '0px' },
    { type: '7segment', name: '7-Segment', tag: 'wokwi-7segment', props: {}, scale: 0.4, yOffset: '0px' },
    { type: 'lcd1602', name: 'LCD 1602', tag: 'wokwi-lcd1602', props: {}, scale: 0.15, yOffset: '0px' },
    { type: 'lcd1602-i2c', name: 'LCD 1602 (I2C)', tag: 'wokwi-lcd1602', props: { pins: 'i2c' }, scale: 0.15, yOffset: '0px'},
    { type: 'neopixel', name: 'NeoPixel', tag: 'wokwi-neopixel', props: {}, scale: 2, yOffset: '0px' },
    { type: 'buzzer', name: 'Buzzer', tag: 'wokwi-buzzer', props: {}, scale: 0.5, yOffset: '0px' },
    { type: 'servo', name: 'Servo Motor', tag: 'wokwi-servo', props: {}, scale: 0.2, yOffset: '0px' },
    { type: 'hc-sr04', name: 'Ultrasonic Sensor', tag: 'wokwi-hc-sr04', props: {}, scale: 0.4, yOffset: '0px' },
    { type: 'membrane-keypad', name: 'Keypad', tag: 'wokwi-membrane-keypad', props: {}, scale: 0.15, yOffset: '0px' },
    // LEDs
{
  type: "rgb-led",
  name: "RGB LED",
  tag: "wokwi-rgb-led",
  props: {},
  scale: 0.6,
  yOffset: "0px",
},
{
  type: "stepper-motor",
  name: "Stepper Motor",
  tag: "wokwi-stepper-motor",
  props: {},
  scale: 0.25,
  yOffset: "0px",
},{
  type: "ldr",
  name: "LDR Sensor",
  tag: "wokwi-photoresistor-sensor",
  props: {},
  scale: 0.4,
  yOffset: "0px",
},

{
  type: "pir",
  name: "PIR Motion Sensor",
  tag: "wokwi-pir-motion-sensor",
  props: {},
  scale: 0.3,
  yOffset: "0px",
},
// RTC
{
  type: "ds1307",
  name: "RTC DS1307",
  tag: "wokwi-ds1307",
  props: {},
  scale: 0.3,
  yOffset: "0px",
},

// OLED
{
  type: "ssd1306",
  name: "OLED SSD1306",
  tag: "wokwi-ssd1306",
  props: {},
  scale: 0.3,
  yOffset: "0px",
},
// Joystick
{
  type: "joystick",
  name: "Joystick",
  tag: "wokwi-analog-joystick",
  props: {},
  scale: 0.35,
  yOffset: "0px",
},

// ESP32
{
  type: "esp32",
  name: "ESP32 DevKit",
  tag: "wokwi-esp32-devkit-v1",
  props: {},
  scale: 0.18,
  yOffset: "0px",
},
  ];

  // Search filter လုပ်ခြင်း
  const filteredComponents = allComponents.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <aside className={`${leftSidebar ? 'w-80 opacity-100' : 'w-0 opacity-100'} px-1 pt-12 bg-[#0f172a] text-white h-screen shadow-2xl border-r border-slate-800 flex flex-col z-50 relative transition-all duration-100 ease-in-out`}>
      {leftSidebar && 
      <>
      <div className="p-4">
        <h4 className="text-md font-bold mb-4 text-cyan-400 tracking-tight text-center">
          အစိတ်အပိုင်းများ
        </h4>

        {/* --- Search Bar --- */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="ရှာဖွေရန်..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-4 pl-10 text-sm focus:outline-none focus:border-cyan-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg
            className="w-4 h-4 absolute left-3 top-2.5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* --- Components List --- */}
      <div className="flex-1 overflow-y-auto px-2 pb-6 custom-scrollbar">
        <div className="grid grid-cols-2 gap-4">
          {filteredComponents.length > 0 ? (
            filteredComponents.map((comp) => (
              <div
                key={comp.type}
                className="group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 cursor-grab active:cursor-grabbing hover:border-cyan-500/50 hover:bg-slate-800 transition-all h-32 flex flex-col items-center justify-center shadow-sm"
                onDragStart={(event) => onDragStart(event, comp.type)}
                draggable
              >
                {comp.type === 'mini-board' && 
                <div>
                  <img src={miniBoard} alt={comp.name} className="w-14 h-14" />
                </div>
                }

                {comp.type === 'half-board' && 
                <div>
                  <img src={halfBoard} alt={comp.name} className="w-20 h-20" />
                </div>
                }

                {comp.type === 'full-board' && 
                <div>
                  <img src={fullBoard} alt={comp.name} className="w-20 h-20" />
                </div>
                }

                <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden pointer-events-none">
                  <div 
                    style={{ 
                      transform: `scale(${comp.scale}) translateY(${comp.yOffset})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {React.createElement(comp.tag, { ...comp.props })}
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <div className="text-[13px] font-medium text-slate-300 group-hover:text-cyan-400 transition-colors">
                    {comp.name}
                  </div>
                </div>
                  
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm italic">
              ရှာမတွေ့ပါ...
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-slate-900/80 border-t border-slate-800">
        <p className="text-[10px] text-slate-500 text-center font-medium">
          Total Components: {filteredComponents.length}
        </p>
      </div>
      </>
      }
      <button onClick={() => setLeftSidebar(!leftSidebar)} className='absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900/80 hover:bg-slate-800/80 p-0.5 border border-slate-800 rounded-full flex items-center justify-center cursor-pointer'>
          { leftSidebar ? 
          <HiArrowLeftOnRectangle className="text-2xl font-semibold" />
          :
          <HiArrowRightEndOnRectangle className='text-2xl font-extrabold' />
          }
      </button>
    </aside>
  );
};

export default Sidebar;