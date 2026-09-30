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
import {
  clearKeypadContacts,
  setKeypadContact,
} from "./simulator/electrical/KeypadInputState";

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
  arduinoBoard?: {
    led13?: boolean;
    ledRX?: boolean;
    ledTX?: boolean;
    ledPower?: boolean;
    resetPressed?: boolean;
  };
  traceActive?: boolean;
  isOn?: boolean;
  brightness?: number;
  sevenSegment?: {
    common?: "cathode" | "anode";
    digits?: number;
    values?: number[];
    colon?: boolean;
  };
  lcd?: {
    text?: string;
    characters?: number[];
    cursorX?: number;
    cursorY?: number;
    displayOn?: boolean;
    cursorOn?: boolean;
    blink?: boolean;
    backlight?: boolean;
    mode?: "4bit" | "8bit" | "i2c";
  };
  buzzer?: {
    active?: boolean;
    currentMa?: number;
    frequencyHz?: number;
  };
  ultrasonic?: {
    distanceCm?: number;
    echoHigh?: boolean;
    triggerActive?: boolean;
    echoPulseUs?: number;
  };
  servo?: {
    angle?: number;
    pulseWidthUs?: number;
    signalPin?: string;
    powered?: boolean;
  };
  pir?: {
    motion?: boolean;
    outputHigh?: boolean;
    powered?: boolean;
    delayTimeSec?: number;
    inhibitTimeSec?: number;
    retrigger?: boolean;
  };
  neopixel?: {
    red?: number;
    green?: number;
    blue?: number;
    color?: string;
    brightness?: number;
    powered?: boolean;
    latched?: boolean;
    frame?: number;
    dataBits?: number;
    interfaceType?: "ws2812b";
  };
  ssd1306?: {
    width?: number;
    height?: number;
    pixels?: number[];
    displayOn?: boolean;
    invert?: boolean;
    contrast?: number;
    interfaceType?: "spi";
    powered?: boolean;
    frame?: number;
  };
  ds1307States?: Record<string, {
    powered?: boolean;
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    second?: number;
    dayOfWeek?: number;
    sqwMode?: number;
    sqwLevel?: 0 | 1;
  }>;
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

  const ssd1306CanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const buzzerAudioRef =
    useRef<{
      context: AudioContext;
      oscillator: OscillatorNode;
      gain: GainNode;
    } | null>(null);

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

  useEffect(() => {
    return () => {
      clearKeypadContacts(id);
    };
  }, [id]);

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

  const isLcd =
    componentType === "lcd1602" ||
    componentType === "lcd-1602" ||
    componentType === "lcd1602-full" ||
    componentType === "lcd1602-i2c" ||
    componentType === "lcd1602_i2c" ||
    componentType === "lcd-i2c";

  const isBuzzer = componentType === "buzzer";

  const isUltrasonic =
    componentType === "hc-sr04" ||
    componentType === "ultrasonic";

  const isPir =
    componentType === "pir" ||
    componentType === "pir-motion-sensor" ||
    componentType === "pir-motion";

  const isServo =
    componentType === "servo" ||
    componentType === "servo-motor" ||
    componentType === "servomotor";

  const isSsd1306 =
    componentType === "ssd1306";

  const isNeoPixel =
    componentType === "neopixel";

  const isArduinoUno =
    componentType === "arduino-uno" ||
    componentType === "arduino";

  const isKeypad =
    componentType === "membrane-keypad" ||
    componentType === "keypad" ||
    componentType === "4x4-keypad";

  // DS1307 is a real Wokwi custom element too. Keep its DOM ref attached
  // so the RTC node can participate in the same component bridge lifecycle
  // as the other simulator-backed peripherals.
  const isDs1307 =
    componentType === "ds1307" ||
    componentType === "rtc-ds1307" ||
    componentType === "rtc";
  const buzzerActive =
    simulation?.buzzer?.active === true;

  const buzzerFrequency =
    typeof simulation?.buzzer?.frequencyHz === "number"
      ? simulation.buzzer.frequencyHz
      : undefined;

  const ultrasonicDistanceCm =
    typeof data.ultrasonicDistanceCm === "number"
      ? Math.max(2, Math.min(400, data.ultrasonicDistanceCm))
      : 100;

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

  const keypadLabels = (() => {
    const configured = Array.isArray(data.props?.keys)
      ? data.props.keys.map((value: unknown) => String(value))
      : [];

    const defaults = [
      "1", "2", "3", "A",
      "4", "5", "6", "B",
      "7", "8", "9", "C",
      "*", "0", "#", "D",
    ];

    return configured.length === 16
      ? configured
      : defaults;
  })();

  const keypadPressedKeys = Array.isArray(data.keypadPressedKeys)
    ? data.keypadPressedKeys.map((value: unknown) => String(value).toUpperCase())
    : (
        data.keypadPressedKey
          ? [String(data.keypadPressedKey).toUpperCase()]
          : []
      );

  /*
   * The Wokwi membrane keypad is the actual interactive component.
   * @wokwi/elements dispatches:
   *   button-press   { detail: { key, row, column } }
   *   button-release { detail: { key, row, column } }
   *
   * Keep the Wokwi element as the UI/input source. The simulator only
   * stores the physical contact state in node.data; DigitalInputSolver
   * then turns each pressed row/column pair into a real matrix short.
   */
  useEffect(() => {
    if (!isKeypad) {
      return;
    }

    const element = componentRef.current;
    if (!element) {
      return;
    }

    type KeypadEventDetail = {
      key?: string;
      row?: number;
      column?: number;
    };

    const setKeypadKey = (
      rawKey: unknown,
      row: unknown,
      column: unknown,
      pressed: boolean,
    ) => {
      const key = String(rawKey ?? "").trim().toUpperCase();
      const rowIndex = Number(row);
      const columnIndex = Number(column);

      if (
        !key ||
        !keypadLabels.some(
          (label) => label.toUpperCase() === key,
        ) ||
        !Number.isInteger(rowIndex) ||
        !Number.isInteger(columnIndex)
      ) {
        return;
      }

      /*
       * Update the simulator's live physical contact immediately.
       * This is deliberately independent from React state because the
       * SimulationEngine keeps a stable circuit topology while running.
       */
      /*
       * Use the key label as the stable identity of the physical
       * button. The Wokwi event normally supplies row/column, but
       * deriving the coordinates from the configured key map gives
       * release handling a safe fallback and prevents a stale contact
       * from being interpreted as a new key press.
       */
      const keyIndex = keypadLabels.findIndex(
        (label) => label.toUpperCase() === key,
      );

      const resolvedRow =
        keyIndex >= 0
          ? Math.floor(keyIndex / 4)
          : rowIndex;

      const resolvedColumn =
        keyIndex >= 0
          ? keyIndex % 4
          : columnIndex;

      if (
        !Number.isInteger(resolvedRow) ||
        !Number.isInteger(resolvedColumn)
      ) {
        return;
      }

      setKeypadContact(
        id,
        resolvedRow,
        resolvedColumn,
        pressed,
      );
    };

    const handleButtonPress = (event: Event) => {
      const detail =
        (event as CustomEvent<KeypadEventDetail>).detail;

      setKeypadKey(
        detail?.key,
        detail?.row,
        detail?.column,
        true,
      );
    };

    const handleButtonRelease = (event: Event) => {
      const detail =
        (event as CustomEvent<KeypadEventDetail>).detail;

      setKeypadKey(
        detail?.key,
        detail?.row,
        detail?.column,
        false,
      );
    };

    element.addEventListener(
      "button-press",
      handleButtonPress,
    );
    element.addEventListener(
      "button-release",
      handleButtonRelease,
    );

    return () => {
      element.removeEventListener(
        "button-press",
        handleButtonPress,
      );
      element.removeEventListener(
        "button-release",
        handleButtonRelease,
      );
    };
  }, [
    id,
    isKeypad,
    keypadLabels,
    setNodes,
  ]);

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
  useEffect(() => {
    if (!isSevenSegment) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            values?: number[];
            colonValue?: boolean;
            common?: "anode" | "cathode";
            digits?: number;
          })
        | null;

    if (!element) {
      return;
    }

    /*
     * Wokwi's 7-segment element has an important electrical attribute:
     *   common="anode"   -> segment LOW = ON
     *   common="cathode" -> segment HIGH = ON
     *
     * The simulator determines the real common type from the circuit
     * topology (5V/GND/GPIO), so the visual Web Component must receive
     * the same mode. Previously we only updated "values", leaving the
     * Wokwi element at its default common-anode mode. A common-cathode
     * circuit could therefore be electrically correct while the display
     * stayed visually OFF.
     */
    const sevenSegment =
      simulation?.sevenSegment;

    const common =
      sevenSegment?.common === "cathode"
        ? "cathode"
        : "anode";

    const digits =
      Number.isFinite(sevenSegment?.digits)
        ? Math.max(
            1,
            Math.min(
              4,
              Number(sevenSegment?.digits),
            ),
          )
        : 1;

    const values =
      Array.isArray(sevenSegment?.values)
        ? sevenSegment.values.map((value) =>
            value ? 1 : 0,
          )
        : new Array(
            digits * 8,
          ).fill(0);

    // Keep both the property and attribute in sync. This works with
    // the current @wokwi/elements Web Component implementation and
    // also keeps the DOM state inspectable in DevTools.
    element.common = common;
    element.setAttribute(
      "common",
      common,
    );

    element.digits = digits;
    element.setAttribute(
      "digits",
      String(digits),
    );

    element.values = values;

    element.colonValue =
      sevenSegment?.colon === true;

    element.setAttribute(
      "colonValue",
      sevenSegment?.colon === true
        ? "1"
        : "0",
    );
  }, [
    isSevenSegment,
    simulation?.sevenSegment?.common,
    simulation?.sevenSegment?.digits,
    simulation?.sevenSegment?.values,
    simulation?.sevenSegment?.colon,
  ]);

  // =========================================================
  // SERVO -> CIRCUIT STATE
  // =========================================================
  useEffect(() => {
    if (!isServo) return;

    const applyServoState = () => {
      const element = componentRef.current as
        | (HTMLElement & {
            angle?: number;
            pulseWidthUs?: number;
          })
        | null;

      if (!element) return;

      const angle =
        typeof simulation?.servo?.angle === "number"
          ? Math.max(0, Math.min(180, simulation.servo.angle))
          : 0;

      element.angle = angle;
      element.setAttribute("angle", String(angle));

      if (typeof simulation?.servo?.pulseWidthUs === "number") {
        element.pulseWidthUs = simulation.servo.pulseWidthUs;
        element.setAttribute(
          "data-pulse-width-us",
          String(simulation.servo.pulseWidthUs),
        );
      }

      element.setAttribute(
        "data-powered",
        simulation?.servo?.powered === true ? "true" : "false",
      );
    };

    applyServoState();

    /*
     * @wokwi/elements registers custom elements asynchronously in some
     * bundling/dev-server orders. Re-apply once the servo element is
     * upgraded so the property assignment is never lost.
     */
    if (
      typeof customElements !== "undefined" &&
      !customElements.get("wokwi-servo")
    ) {
      void customElements.whenDefined("wokwi-servo").then(() => {
        applyServoState();
      });
    }
  }, [
    isServo,
    simulation?.servo?.angle,
    simulation?.servo?.pulseWidthUs,
    simulation?.servo?.powered,
  ]);

  // =========================================================
  // SSD1306 OLED -> CIRCUIT STATE
  // =========================================================
  //
  // The Wokwi element supplies the board/chassis visual. The functional
  // framebuffer comes from the real I2C SSD1306 runtime and is painted
  // into this canvas so the pixels shown here are firmware-driven.
  // =========================================================
  useEffect(() => {
    if (!isSsd1306) {
      return;
    }

    const canvas = ssd1306CanvasRef.current;
    const oled = simulation?.ssd1306;

    if (!canvas || !oled) {
      return;
    }

    const width = 128;
    const height = 64;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const image = context.createImageData(width, height);
    const pixels = Array.isArray(oled.pixels)
      ? oled.pixels
      : [];

    for (let index = 0; index < width * height; index += 1) {
      const on = pixels[index] === 1;

      /*
       * Keep the OLED visually black when it is unpowered or OFF.
       * Contrast is represented as brightness, while preserving the
       * monochrome nature of the real SSD1306 controller.
       */
      const brightness = on
        ? Math.max(
            40,
            Math.min(
              255,
              Math.round(
                40 +
                ((oled.contrast ?? 0x7f) / 255) * 215,
              ),
            ),
          )
        : 0;

      const offset = index * 4;
      image.data[offset] = brightness;
      image.data[offset + 1] = brightness;
      image.data[offset + 2] = brightness;
      image.data[offset + 3] = 255;
    }

    context.putImageData(image, 0, 0);
  }, [
    isSsd1306,
    simulation?.ssd1306?.pixels,
    simulation?.ssd1306?.displayOn,
    simulation?.ssd1306?.invert,
    simulation?.ssd1306?.contrast,
    simulation?.ssd1306?.powered,
    simulation?.ssd1306?.frame,
  ]);

  // =========================================================
  // LCD 1602 -> CIRCUIT STATE
  // =========================================================
  useEffect(() => {
    if (!isLcd) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            characters?: number[] | Uint8Array;
            text?: string;
            cursorX?: number;
            cursorY?: number;
            displayOn?: boolean;
            cursor?: boolean;
            blink?: boolean;
            backlight?: boolean;
          })
        | null;

    if (!element) {
      return;
    }

    const lcd = simulation?.lcd;
    const characters =
      Array.isArray(lcd?.characters)
        ? lcd.characters
        : new Array(32).fill(32);

    element.characters = characters;
    element.text =
      typeof lcd?.text === "string"
        ? lcd.text
        : String.fromCharCode(...characters);
    element.cursorX = lcd?.cursorX ?? 0;
    element.cursorY = lcd?.cursorY ?? 0;
    element.cursor =
      lcd?.cursorOn === true;
    element.blink =
      lcd?.blink === true;
    element.backlight =
      lcd?.backlight !== false;

    element.setAttribute(
      "data-simulation-text",
      element.text,
    );
  }, [
    isLcd,
    simulation?.lcd?.text,
    simulation?.lcd?.characters,
    simulation?.lcd?.cursorX,
    simulation?.lcd?.cursorY,
    simulation?.lcd?.cursorOn,
    simulation?.lcd?.blink,
    simulation?.lcd?.backlight,
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
  // PIR MOTION SENSOR
  // =========================================================
  //
  // Wokwi Elements provides the visual part. The simulator owns the
  // electrical behavior, so clicking this control emits a motion event
  // into SimulationEngine via a monotonically increasing trigger id.
  // =========================================================

  const pirPowered =
    simulation?.pir?.powered === true;

  const pirMotion =
    simulation?.pir?.motion === true;

  const pirDelayTimeSec =
    typeof data.pirDelayTime === "number"
      ? Math.max(0, Math.min(60, data.pirDelayTime))
      : 5;

  const pirInhibitTimeSec =
    typeof data.pirInhibitTime === "number"
      ? Math.max(0, Math.min(60, data.pirInhibitTime))
      : 1.2;

  const pirRetrigger =
    data.pirRetrigger !== false;

  const triggerPirMotion = () => {
    if (!isPir) return;

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                pirMotionTrigger:
                  (Number(node.data?.pirMotionTrigger) || 0) + 1,
              },
            }
          : node,
      ),
    );
  };

  useEffect(() => {
    if (!isPir) return;

    const element =
      componentRef.current as
        | (HTMLElement & {
            motion?: boolean;
          })
        | null;

    if (!element) return;

    /*
     * Some versions of the visual element expose a motion property.
     * Setting it is harmless when unsupported and keeps the visual
     * element synchronized when the property exists.
     */
    element.motion = pirMotion;
    element.setAttribute(
      "data-motion",
      String(pirMotion),
    );
  }, [isPir, pirMotion]);

  // =========================================================
  // BUZZER -> BROWSER AUDIO
  // =========================================================

  useEffect(() => {
    const stopAudio = () => {
      const audio = buzzerAudioRef.current;
      if (!audio) return;
      try {
        audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.01);
        audio.oscillator.stop(audio.context.currentTime + 0.02);
      } catch {
        // Oscillator may already be stopped.
      }
      void audio.context.close();
      buzzerAudioRef.current = null;
    };

    if (!isBuzzer || !buzzerActive || !buzzerFrequency) {
      stopAudio();
      return;
    }

    if (buzzerAudioRef.current) {
      buzzerAudioRef.current.oscillator.frequency.setTargetAtTime(
        Math.max(20, Math.min(20000, buzzerFrequency)),
        buzzerAudioRef.current.context.currentTime,
        0.005,
      );
      return stopAudio;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    try {
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "square";
      oscillator.frequency.value = Math.max(20, Math.min(20000, buzzerFrequency));
      gain.gain.value = 0.035;

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      void context.resume();

      buzzerAudioRef.current = { context, oscillator, gain };
    } catch {
      // Browser audio permission/autoplay restrictions are non-fatal.
    }

    return stopAudio;
  }, [isBuzzer, buzzerActive, buzzerFrequency]);

  // =========================================================
  // HC-SR04 -> SIMULATED DISTANCE
  // =========================================================

  useEffect(() => {
    if (!isUltrasonic) return;
    const element = componentRef.current as
      | (HTMLElement & { distance?: number | string })
      | null;
    if (!element) return;
    element.distance = ultrasonicDistanceCm;
    element.setAttribute("distance", String(ultrasonicDistanceCm));
  }, [isUltrasonic, ultrasonicDistanceCm]);

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
  // WS2812B NEOPIXEL -> WOKWI ELEMENT
  // =========================================================
  useEffect(() => {
    if (!isNeoPixel) {
      return;
    }

    const applyColor = () => {
      const element =
        componentRef.current as
          | (HTMLElement & {
              r?: number;
              g?: number;
              b?: number;
            })
          | null;

      if (!element) {
        return;
      }

      /*
       * @wokwi/elements already renders the NeoPixel itself.
       * The simulator owns the WS2812B state; the Wokwi element
       * remains the visual renderer. Never draw a second LED overlay.
       */
      const powered =
        simulation?.neopixel?.powered === true;

      const red = powered
        ? Math.max(
            0,
            Math.min(
              255,
              Math.round(
                simulation?.neopixel?.red ?? 0,
              ),
            ),
          )
        : 0;

      const green = powered
        ? Math.max(
            0,
            Math.min(
              255,
              Math.round(
                simulation?.neopixel?.green ?? 0,
              ),
            ),
          )
        : 0;

      const blue = powered
        ? Math.max(
            0,
            Math.min(
              255,
              Math.round(
                simulation?.neopixel?.blue ?? 0,
              ),
            ),
          )
        : 0;

      /*
       * Set both LitElement properties and attributes. The explicit
       * property assignment is the important part for the Wokwi
       * custom element; attributes are kept in sync for inspection
       * and custom-element upgrade timing.
       */
      element.r = red;
      element.g = green;
      element.b = blue;

      element.setAttribute("r", String(red));
      element.setAttribute("g", String(green));
      element.setAttribute("b", String(blue));
      element.setAttribute(
        "data-simulation-powered",
        String(powered),
      );
    };

    applyColor();

    /*
     * React can render a custom element before its definition is
     * upgraded. Re-apply after the element is defined so the Wokwi
     * renderer receives the color through its real public properties.
     */
    if (
      typeof customElements !== "undefined" &&
      customElements.get("wokwi-neopixel") === undefined
    ) {
      void customElements
        .whenDefined("wokwi-neopixel")
        .then(applyColor)
        .catch(() => undefined);
    }
  }, [
    isNeoPixel,
    simulation?.neopixel?.red,
    simulation?.neopixel?.green,
    simulation?.neopixel?.blue,
    simulation?.neopixel?.powered,
    simulation?.neopixel?.frame,
  ]);

  // =========================================================
  // DS1307 RTC -> WOKWI ELEMENT / NODE STATE
  // =========================================================
  useEffect(() => {
    if (!isDs1307) {
      return;
    }

    const element =
      componentRef.current as
        | (HTMLElement & {
            powered?: boolean;
            sqwLevel?: number;
            sqwMode?: number;
          })
        | null;

      console.log("element:", element);

    if (!element) {
      return;
    }

    const rtcState =
      simulation?.ds1307States?.[id];

    const powered =
      rtcState?.powered === true;

    /*
     * DS1307 is an I2C peripheral, so the actual clock/register
     * behavior stays inside Ds1307Runtime. This effect is only the
     * ElectronicNode bridge: it receives the runtime state and keeps
     * the real Wokwi element synchronized with the simulator.
     */
    element.setAttribute(
      "data-simulation-powered",
      String(powered),
    );
    element.setAttribute(
      "data-simulation-sqw-level",
      String(rtcState?.sqwLevel ?? 0),
    );
    element.setAttribute(
      "data-simulation-sqw-mode",
      String(rtcState?.sqwMode ?? 0),
    );

    if ("powered" in element) {
      element.powered = powered;
    }

    if ("sqwLevel" in element) {
      element.sqwLevel =
        rtcState?.sqwLevel ?? 0;
    }

    if ("sqwMode" in element) {
      element.sqwMode =
        rtcState?.sqwMode ?? 0;
    }
  }, [
    id,
    isDs1307,
    simulation?.ds1307States,
    simulation?.ds1307States?.[id]?.powered,
    simulation?.ds1307States?.[id]?.sqwLevel,
    simulation?.ds1307States?.[id]?.sqwMode,
    simulation?.ds1307States?.[id]?.year,
    simulation?.ds1307States?.[id]?.month,
    simulation?.ds1307States?.[id]?.day,
    simulation?.ds1307States?.[id]?.hour,
    simulation?.ds1307States?.[id]?.minute,
    simulation?.ds1307States?.[id]?.second,
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
  // ARDUINO UNO BOARD CONTROLS / STATUS LEDs
  // =========================================================
  useEffect(() => {
    if (!isArduinoUno) return;

    const element = componentRef.current as
      | (HTMLElement & {
          led13?: boolean;
          ledRX?: boolean;
          ledTX?: boolean;
          ledPower?: boolean;
        })
      | null;

    if (!element) return;

    const board = simulation?.arduinoBoard;
    element.led13 = board?.led13 === true;
    element.ledRX = board?.ledRX === true;
    element.ledTX = board?.ledTX === true;
    element.ledPower = board?.ledPower === true;
  }, [
    isArduinoUno,
    simulation?.arduinoBoard?.led13,
    simulation?.arduinoBoard?.ledRX,
    simulation?.arduinoBoard?.ledTX,
    simulation?.arduinoBoard?.ledPower,
  ]);

  useEffect(() => {
    if (!isArduinoUno) return;

    const element = componentRef.current;
    if (!element) return;

    const handleResetPress = (event: Event) => {
      if ((event as CustomEvent<unknown>).detail !== "reset") return;
      window.dispatchEvent(
        new CustomEvent("circuit:arduino-reset", {
          detail: { nodeId: id },
        }),
      );
    };

    element.addEventListener("button-press", handleResetPress);
    return () => {
      element.removeEventListener("button-press", handleResetPress);
    };
  }, [id, isArduinoUno]);

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

      className={`
        group
        relative
        border-2
        ${simulation?.traceActive ? "border-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.55)]" : "border-transparent"}
        hover:border-blue-400/60
      `}
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
                isSevenSegment ||
                isLcd ||
                isBuzzer ||
                isUltrasonic ||
                isPir ||
                isServo ||
                isSsd1306 ||
                isNeoPixel ||
                isDs1307 ||
                isArduinoUno ||
                isKeypad
                  ? componentRef
                  : undefined,
            }
          )}

        {/* The Wokwi membrane-keypad element is the real UI/input source. */}
        {isDs1307 && (
          <div
            className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-42.5 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-950/95 px-2 py-1.5 font-mono text-[10px] shadow-lg"
            aria-label="DS1307 RTC simulation state"
          >
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-500">
              <span>DS1307 RTC</span>
              <span
                className={
                  simulation?.ds1307States?.[id]?.powered
                    ? "text-emerald-400"
                    : "text-red-400"
                }
              >
                {simulation?.ds1307States?.[id]?.powered ? "POWER" : "OFF"}
              </span>
            </div>
            <div className="mt-1 text-center text-sm font-semibold tabular-nums text-emerald-300">
              {(() => {
                const rtc = simulation?.ds1307States?.[id];
                if (!rtc) return "--:--:--";
                const pad = (value: number | undefined) =>
                  String(value ?? 0).padStart(2, "0");
                return (
                  pad(rtc.hour) +
                  ":" +
                  pad(rtc.minute) +
                  ":" +
                  pad(rtc.second)
                );
              })()}
            </div>
            <div className="text-center text-[9px] tabular-nums text-slate-400">
              {(() => {
                const rtc = simulation?.ds1307States?.[id];
                if (!rtc) return "----/--/--";
                return (
                  String(rtc.year ?? 0) +
                  "-" +
                  String(rtc.month ?? 0).padStart(2, "0") +
                  "-" +
                  String(rtc.day ?? 0).padStart(2, "0")
                );
              })()}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[8px] text-slate-500">
              <span
                className={
                  simulation?.ds1307States?.[id]?.sqwLevel
                    ? "text-cyan-300"
                    : "text-slate-600"
                }
              >
                SQW
              </span>
              <span>{simulation?.ds1307States?.[id]?.sqwMode ?? 0}</span>
            </div>
          </div>
        )}

        {isSsd1306 && (
          <canvas
            ref={ssd1306CanvasRef}
            width={128}
            height={64}
            aria-label="SSD1306 OLED display"
            className="pointer-events-none absolute left-1/2 top-[22%] z-20 w-[86%] p-1 -translate-x-1/2 bg-black shadow-inner"
            style={{
              aspectRatio: "2 / 1",
              imageRendering: "pixelated",
              transform: "rotateY(180deg)",
              opacity:
                simulation?.ssd1306?.powered === false
                  ? 0.35
                  : 1,
            }}
          />
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

        {isUltrasonic && (
          <div
            className="absolute left-1/2 top-full z-40 mt-2 w-40 -translate-x-1/2 rounded-lg border border-slate-300 bg-white/95 px-2 py-2 shadow-lg backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between text-[8px] font-medium text-slate-500">
              <span>2 cm</span>
              <span className="font-semibold text-slate-700">{ultrasonicDistanceCm.toFixed(0)} cm</span>
              <span>400 cm</span>
            </div>
            <input type="range" min="2" max="400" step="1" value={ultrasonicDistanceCm}
              onChange={(event) => {
                const distanceCm = Math.max(2, Math.min(400, Number(event.target.value)));
                setNodes((currentNodes) => currentNodes.map((node) =>
                  node.id === id ? { ...node, data: { ...node.data, ultrasonicDistanceCm: distanceCm } } : node,
                ));
              }}
              className="h-1.5 w-full cursor-pointer accent-cyan-500"
              aria-label="HC-SR04 distance"
            />
            <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400">
              <span>Near</span>
              <span>Echo {simulation?.ultrasonic?.echoHigh ? "HIGH" : "LOW"}</span>
              <span>Far</span>
            </div>
          </div>
        )}

        {isPir && (
          <div
            className="absolute left-1/2 top-full z-40 mt-2 w-44 -translate-x-1/2 rounded-lg border border-slate-300 bg-white/95 px-2 py-2 shadow-lg backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={triggerPirMotion}
              disabled={!pirPowered || pirMotion}
              className="w-full rounded-md bg-cyan-500 px-2 py-1.5 text-[9px] font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-45"
              title={
                !pirPowered
                  ? "Connect VCC and GND to simulate motion"
                  : pirMotion
                    ? "Motion is currently active"
                    : "Trigger PIR motion"
              }
            >
              {pirMotion ? "Motion Detected" : "Simulate Motion"}
            </button>

            <div className="mt-1.5 flex items-center justify-between text-[8px] text-slate-500">
              <span>OUT</span>
              <span className="font-semibold text-slate-700">
                {simulation?.pir?.outputHigh ? "HIGH" : "LOW"}
              </span>
              <span>
                {pirPowered ? "Powered" : "No Power"}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[8px] text-slate-400">
              <span>{pirDelayTimeSec.toFixed(1)}s HIGH</span>
              <span>
                {pirRetrigger ? "Retrigger ON" : "Retrigger OFF"}
              </span>
            </div>
          </div>
        )}

        {isBuzzer && buzzerActive && (
          <div className="absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-amber-300 bg-white/95 px-2 py-1 text-[8px] font-medium text-slate-700 shadow-lg">
            {"🔊 " + (buzzerFrequency ? Math.round(buzzerFrequency) + " Hz" : "ACTIVE")}
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