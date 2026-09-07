import React, { useEffect, useMemo, useState } from "react";
import "@wokwi/elements";

import {
  HiChevronDown,
  HiMagnifyingGlass,
  HiOutlineCube,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi2";

import "./circuit.css";

import miniBoard from "../assets/gemini-svg (1).svg";
import halfBoard from "../assets/gemini-svg (2).svg";
import fullBoard from "../assets/gemini-svg (3).svg";


type CategoryButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};


function CategoryButton({
  active,
  onClick,
  children,
}: CategoryButtonProps) {

  return (

    <button
      onClick={onClick}
      className={`
        shrink-0
        h-9
        px-3
        rounded-md
        text-xs
        font-medium
        transition-all

        ${
          active
            ? `
              bg-[#1877d3]
              text-white
              shadow-lg
              shadow-blue-500/10
            `
            : `
              bg-transparent
              text-slate-400
              hover:bg-[#0d1c30]
              hover:text-slate-200
            `
        }
      `}
    >

      {children}

    </button>

  );
}

type Category =
  | "all"
  | "basic"
  | "microcontroller"
  | "sensors";


type ComponentItem = {
  type: string;
  name: string;
  tag?: string;
  props?: Record<string, any>;
  scale: number;
  yOffset: string;
  category: Exclude<Category, "all">;
  image?: string;
};

type ComponentCardProps = {
  component: ComponentItem;

  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string
  ) => void;
};


function ComponentCard({
  component,
  onDragStart,
}: ComponentCardProps) {

  return (

    <div
      draggable
      onDragStart={(event) =>
        onDragStart(
          event,
          component.type
        )
      }
      className="
        group
        relative

        h-38

        bg-[#0a192b]

        border
        border-[#1b3856]

        rounded-xl

        cursor-grab
        active:cursor-grabbing

        overflow-hidden

        transition-all
        duration-200

        hover:border-blue-500/70
        hover:bg-[#0d1e33]

        hover:-translate-y-0.5

        hover:shadow-lg
        hover:shadow-blue-950/30
      "
    >

      {/* =====================
          COMPONENT PREVIEW
      ===================== */}

      <div
        className="
          h-27
          flex
          items-center
          justify-center
          overflow-hidden
          pointer-events-none
        "
      >

        {/* SVG BOARD */}

        {component.image ? (

          <img
            src={component.image}
            alt={component.name}
            draggable={false}
            className="
              max-w-22
              max-h-18.75
              object-contain
              select-none
              transition-transform
              duration-200
              group-hover:scale-105
            "
          />

        ) : component.tag ? (

          /* WOKWI COMPONENT */

          <div
            className="
              flex
              items-center
              justify-center
              transition-transform
              duration-200
              group-hover:scale-105
            "
            style={{
              transform: `
                scale(${component.scale})
                translateY(${component.yOffset})
              `,
              transformOrigin:
                "center center",
            }}
          >

            {React.createElement(
              component.tag,
              component.props || {}
            )}

          </div>

        ) : null}

      </div>


      {/* =====================
          COMPONENT NAME
      ===================== */}

      <div
        className="
          absolute
          bottom-0
          left-0
          w-full

          h-11

          flex
          items-center
          justify-center

          border-t
          border-[#152d48]/60

          px-2
        "
      >

        <span
          className="
            text-[11px]
            font-medium
            text-slate-300

            text-center
            truncate
            w-full

            group-hover:text-blue-400

            transition-colors
          "
        >
          {component.name}
        </span>

      </div>

    </div>

  );
}

const Sidebar = () => {

  const [searchTerm, setSearchTerm] =
    useState("");

  const [mounted, setMounted] =
    useState(false);

  const [leftSidebar, setLeftSidebar] =
    useState(true);

  const [activeCategory, setActiveCategory] =
    useState<Category>("all");


  useEffect(() => {

    setMounted(true);

  }, []);


  // =========================
  // DRAG START
  // =========================

  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string
  ) => {

    event.dataTransfer.setData(
      "application/reactflow",
      nodeType
    );

    event.dataTransfer.effectAllowed =
      "move";
  };


  // =========================
  // COMPONENT DATA
  // =========================

  const allComponents: ComponentItem[] = [

    // =========================
    // BASIC
    // =========================

    {
      type: "mini-board",
      name: "Mini Board",
      scale: 0.5,
      yOffset: "-15px",
      category: "basic",
      image: miniBoard,
    },

    {
      type: "half-board",
      name: "Half Board",
      scale: 0.5,
      yOffset: "-15px",
      category: "basic",
      image: halfBoard,
    },

    {
      type: "full-board",
      name: "Full Board",
      scale: 0.5,
      yOffset: "-15px",
      category: "basic",
      image: fullBoard,
    },

    {
      type: "led-red",
      name: "Red LED",
      tag: "wokwi-led",
      props: {
        color: "red",
      },
      scale: 0.8,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "led-green",
      name: "Green LED",
      tag: "wokwi-led",
      props: {
        color: "green",
      },
      scale: 0.8,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "led-blue",
      name: "Blue LED",
      tag: "wokwi-led",
      props: {
        color: "blue",
      },
      scale: 0.8,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "resistor",
      name: "Resistor",
      tag: "wokwi-resistor",
      props: {
        value: "1000",
      },
      scale: 0.8,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "pushbutton",
      name: "Pushbutton",
      tag: "wokwi-pushbutton",
      props: {},
      scale: 0.55,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "potentiometer",
      name: "Potentiometer",
      tag: "wokwi-potentiometer",
      props: {},
      scale: 0.45,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "slide-switch",
      name: "Slide Switch",
      tag: "wokwi-slide-switch",
      props: {},
      scale: 0.8,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "7segment",
      name: "7-Segment",
      tag: "wokwi-7segment",
      props: {},
      scale: 0.4,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "lcd1602",
      name: "LCD 1602",
      tag: "wokwi-lcd1602",
      props: {},
      scale: 0.15,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "lcd1602-i2c",
      name: "LCD 1602 I2C",
      tag: "wokwi-lcd1602",
      props: {
        pins: "i2c",
      },
      scale: 0.15,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "neopixel",
      name: "NeoPixel",
      tag: "wokwi-neopixel",
      props: {},
      scale: 2,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "buzzer",
      name: "Buzzer",
      tag: "wokwi-buzzer",
      props: {},
      scale: 0.55,
      yOffset: "0px",
      category: "basic",
    },


    // =========================
    // MICROCONTROLLER
    // =========================

    {
      type: "arduino-uno",
      name: "Arduino Uno",
      tag: "wokwi-arduino-uno",
      props: {},
      scale: 0.2,
      yOffset: "-15px",
      category: "microcontroller",
    },

    {
      type: "arduino-mega",
      name: "Arduino Mega",
      tag: "wokwi-arduino-mega",
      props: {},
      scale: 0.2,
      yOffset: "-10px",
      category: "microcontroller",
    },

    {
      type: "arduino-nano",
      name: "Arduino Nano",
      tag: "wokwi-arduino-nano",
      props: {},
      scale: 0.3,
      yOffset: "0px",
      category: "microcontroller",
    },

    {
      type: "respberry-pico",
      name: "Raspberry Pi Pico",
      tag: "wokwi-pi-pico",
      props: {},
      scale: 0.3,
      yOffset: "0px",
      category: "microcontroller",
    },

    {
      type: "esp32",
      name: "ESP32 DevKit",
      tag: "wokwi-esp32-devkit-v1",
      props: {},
      scale: 0.18,
      yOffset: "0px",
      category: "microcontroller",
    },


    // =========================
    // SENSORS
    // =========================

    {
      type: "hc-sr04",
      name: "Ultrasonic Sensor",
      tag: "wokwi-hc-sr04",
      props: {},
      scale: 0.4,
      yOffset: "0px",
      category: "sensors",
    },

    {
      type: "ldr",
      name: "LDR Sensor",
      tag: "wokwi-photoresistor-sensor",
      props: {},
      scale: 0.4,
      yOffset: "0px",
      category: "sensors",
    },

    {
      type: "pir",
      name: "PIR Motion Sensor",
      tag: "wokwi-pir-motion-sensor",
      props: {},
      scale: 0.3,
      yOffset: "0px",
      category: "sensors",
    },

    {
      type: "ds1307",
      name: "RTC DS1307",
      tag: "wokwi-ds1307",
      props: {},
      scale: 0.3,
      yOffset: "0px",
      category: "sensors",
    },

    {
      type: "ssd1306",
      name: "OLED SSD1306",
      tag: "wokwi-ssd1306",
      props: {},
      scale: 0.3,
      yOffset: "0px",
      category: "sensors",
    },

    {
      type: "joystick",
      name: "Joystick",
      tag: "wokwi-analog-joystick",
      props: {},
      scale: 0.35,
      yOffset: "0px",
      category: "sensors",
    },

    {
      type: "rgb-led",
      name: "RGB LED",
      tag: "wokwi-rgb-led",
      props: {},
      scale: 0.6,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "servo",
      name: "Servo Motor",
      tag: "wokwi-servo",
      props: {},
      scale: 0.2,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "stepper-motor",
      name: "Stepper Motor",
      tag: "wokwi-stepper-motor",
      props: {},
      scale: 0.25,
      yOffset: "0px",
      category: "basic",
    },

    {
      type: "membrane-keypad",
      name: "Keypad",
      tag: "wokwi-membrane-keypad",
      props: {},
      scale: 0.15,
      yOffset: "0px",
      category: "basic",
    },

  ];


  // =========================
  // FILTER COMPONENTS
  // =========================

  const filteredComponents = useMemo(() => {

    return allComponents.filter((component) => {

      const matchSearch =
        component.name
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          );

      const matchCategory =
        activeCategory === "all"
          ? true
          : component.category ===
            activeCategory;

      return (
        matchSearch &&
        matchCategory
      );
    });

  }, [
    searchTerm,
    activeCategory,
  ]);


  if (!mounted) {
    return null;
  }


  return (

    <aside
      className={`
        relative
        shrink-0
        h-screen
        bg-[#081426]
        border-r
        border-[#18304c]
        shadow-2xl
        transition-all
        duration-300
        ease-in-out
        z-50

        ${
          leftSidebar
            ? "w-[320px]"
            : "w-0"
        }
      `}
    >

      {/* =========================
          SIDEBAR CONTENT
      ========================= */}

      <div
        className={`
          h-full
          flex
          flex-col
          overflow-hidden
          transition-opacity
          duration-200

          ${
            leftSidebar
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }
        `}
      >


        {/* =========================
            HEADER
        ========================= */}

        <div className="px-3 pt-3 pb-2">

          {/* Header Row */}

          <div
            className="
              flex
              items-center
              justify-between
              mb-3
            "
          >

            <div
              className="
                flex
                items-center
                gap-2
              "
            >

              <div
                className="
                  w-5
                  h-5
                  flex
                  items-center
                  justify-center
                  text-slate-400
                "
              >
                <HiOutlineCube
                  className="text-lg"
                />
              </div>


              <h2
                className="
                  text-sm
                  font-semibold
                  text-slate-200
                "
              >
                Components
              </h2>

            </div>


            <HiChevronDown
              className="
                text-slate-400
                text-base
              "
            />

          </div>


          {/* =========================
              SEARCH BAR
          ========================= */}

          <div className="relative">

            <HiMagnifyingGlass
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-500
                text-lg
                pointer-events-none
              "
            />


            <input
              type="text"
              placeholder="ရှာဖွေရန်..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              className="
                w-full
                h-9
                pl-10
                pr-3
                text-xs
                text-slate-200
                placeholder:text-slate-500
                bg-[#0d1c30]
                border
                border-[#203b5a]
                rounded-md
                outline-none
                transition
                focus:border-blue-500
                focus:ring-1
                focus:ring-blue-500/30
              "
            />

          </div>

        </div>


        {/* =========================
            CATEGORY TABS
        ========================= */}

        <div
          className="
            px-3
            pb-3
            flex
            items-center
            gap-1
            overflow-x-auto
            custom-scrollbar-hide
          "
        >

          <CategoryButton
            active={
              activeCategory === "all"
            }
            onClick={() =>
              setActiveCategory("all")
            }
          >
            All
          </CategoryButton>


          <CategoryButton
            active={
              activeCategory === "basic"
            }
            onClick={() =>
              setActiveCategory("basic")
            }
          >
            Basic
          </CategoryButton>


          <CategoryButton
            active={
              activeCategory ===
              "microcontroller"
            }
            onClick={() =>
              setActiveCategory(
                "microcontroller"
              )
            }
          >
            Microcontroller
          </CategoryButton>


          <CategoryButton
            active={
              activeCategory === "sensors"
            }
            onClick={() =>
              setActiveCategory(
                "sensors"
              )
            }
          >
            Sensors
          </CategoryButton>

        </div>


        {/* =========================
            COMPONENT LIST
        ========================= */}

        <div
          className="
            flex-1
            overflow-y-auto
            px-3
            pb-4
            custom-scrollbar
          "
        >

          <div
            className="
              grid
              grid-cols-2
              gap-3
            "
          >

            {filteredComponents.length > 0 ? (

              filteredComponents.map(
                (component) => (

                  <ComponentCard
                    key={
                      component.type
                    }
                    component={
                      component
                    }
                    onDragStart={
                      onDragStart
                    }
                  />

                )
              )

            ) : (

              <div
                className="
                  col-span-2
                  py-12
                  text-center
                "
              >

                <HiMagnifyingGlass
                  className="
                    mx-auto
                    mb-3
                    text-2xl
                    text-slate-600
                  "
                />

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  Component မတွေ့ပါ
                </p>

              </div>

            )}

          </div>

        </div>


        {/* =========================
            FOOTER
        ========================= */}

        <div
          className="
            h-12
            shrink-0
            flex
            items-center
            gap-2
            px-4
            border-t
            border-[#18304c]
            bg-[#071223]
          "
        >

          <HiOutlineCube
            className="
              text-slate-400
              text-lg
            "
          />


          <span
            className="
              text-xs
              font-medium
              text-slate-400
            "
          >
            Total Components:
            {" "}
            {allComponents.length}
          </span>

        </div>

      </div>


      {/* =========================
          COLLAPSE BUTTON
      ========================= */}

      <button
        onClick={() =>
          setLeftSidebar(
            (previous) =>
              !previous
          )
        }
        className="
          absolute
          -right-6
          top-1/2
          -translate-y-1/2

          w-6
          h-10

          bg-[#0d1c30]
          border
          border-[#254563]

          rounded-r-xl

          flex
          items-center
          justify-center

          text-slate-300

          hover:bg-[#13263e]
          hover:text-blue-400

          transition

          cursor-pointer
          z-60
        "
        title={
          leftSidebar
            ? "Collapse Sidebar"
            : "Expand Sidebar"
        }
      >

        {leftSidebar ? (

          <HiOutlineChevronLeft
            className="
              text-xl
            "
          />

        ) : (

          <HiOutlineChevronRight
            className="
              text-xl
            "
          />

        )}

      </button>

    </aside>
  );
};


export default Sidebar;