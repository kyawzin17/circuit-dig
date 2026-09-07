import type { CircuitPin } from "../types/pin.types";


export const resistorPins: CircuitPin[] = [

  // =====================================================
  // TERMINAL A
  // =====================================================

  {
    id: "A",

    label: "A",

    alias: "Terminal 1",

    type: "terminal",

    direction: "passive",

    description:
      "First passive terminal of the resistor. A resistor has no polarity, so terminal A and terminal B are electrically interchangeable.",
  },


  // =====================================================
  // TERMINAL B
  // =====================================================

  {
    id: "B",

    label: "B",

    alias: "Terminal 2",

    type: "terminal",

    direction: "passive",

    description:
      "Second passive terminal of the resistor. A resistor has no polarity, so terminal B and terminal A are electrically interchangeable.",
  },

];