import { create } from "zustand";
import {
  compileArduinoSketch,
} from "../circuits/simulator/compiler/ArduinoCompiler";

export type SimulationStatus =
  | "idle"
  | "compiling"
  | "compiled"
  | "running"
  | "stopped"
  | "error";

type SimulationStore = {
  code: string;
  setCode: (code: string) => void;

  status: SimulationStatus;
  hex: string | null;
  fqbn: string;
  logs: string;
  error: string | null;

  compile: () => Promise<boolean>;
  setRunning: () => void;
  stop: () => void;
  reset: () => void;
};

const DEFAULT_CODE = `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);

  digitalWrite(13, LOW);
  delay(1000);
}
`;

export const useSimulationStore =
  create<SimulationStore>((set, get) => ({
    code: DEFAULT_CODE,

    setCode: (code) => {
      set({
        code,
        error: null,
      });
    },

    status: "idle",
    hex: null,
    fqbn: "arduino:avr:uno",
    logs: "",
    error: null,

    compile: async () => {
      const {
        code,
        fqbn,
      } = get();

      set({
        status: "compiling",
        error: null,
        logs: "",
      });

      try {
        const result =
          await compileArduinoSketch({
            code,
            fqbn,
          });

        if (!result.success || !result.hex) {
          set({
            status: "error",
            error:
              result.error ??
              "Compilation failed.",
            logs: result.logs ?? "",
            hex: null,
          });

          return false;
        }

        set({
          status: "compiled",
          hex: result.hex,
          logs: result.logs ?? "",
          error: null,
        });

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to connect to compiler server.";

        set({
          status: "error",
          error: message,
          hex: null,
        });

        return false;
      }
    },

    setRunning: () => {
      set({
        status: "running",
        error: null,
      });
    },

    stop: () => {
      set({
        status: "stopped",
      });
    },

    reset: () => {
      set({
        status: "idle",
        hex: null,
        logs: "",
        error: null,
      });
    },
  }));
