import { create } from "zustand";

/* =========================================================
   TYPES
========================================================= */

export type SimulationStatus =
  | "idle"
  | "compiling"
  | "compiled"
  | "running"
  | "stopped"
  | "error";

type CompileResult = {
  success: boolean;
  hex?: string;
  fqbn?: string;
  logs?: string;
  error?: string;
};

type SimulationStore = {
  /* ---------------------------------------------
     Code
  --------------------------------------------- */

  code: string;

  setCode: (
    code: string
  ) => void;

  /* ---------------------------------------------
     Simulation
  --------------------------------------------- */

  status: SimulationStatus;

  hex: string | null;

  fqbn: string;

  logs: string;

  error: string | null;

  /* ---------------------------------------------
     Actions
  --------------------------------------------- */

  compile: () => Promise<boolean>;

  setRunning: () => void;

  stop: () => void;

  reset: () => void;
};

/* =========================================================
   DEFAULT ARDUINO CODE
========================================================= */

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

/* =========================================================
   STORE
========================================================= */

export const useSimulationStore =
  create<SimulationStore>(
    (set, get) => ({
      /* ===============================================
         CODE
      =============================================== */

      code: DEFAULT_CODE,

      setCode: (code) => {
        set({
          code,
          error: null,
        });
      },

      /* ===============================================
         SIMULATION STATE
      =============================================== */

      status: "idle",

      hex: null,

      fqbn:
        "arduino:avr:uno",

      logs: "",

      error: null,

      /* ===============================================
         COMPILE
      =============================================== */

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
          const response =
            await fetch(
              "http://localhost:7000/api/arduino/compile",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  code,
                  fqbn,
                }),
              }
            );

          const result =
            (await response.json()) as CompileResult;

          /* ---------------------------------------
             Compile failed
          --------------------------------------- */

          if (
            !response.ok ||
            !result.success ||
            !result.hex
          ) {
            set({
              status: "error",

              error:
                result.error ||
                "Compilation failed.",

              logs:
                result.logs || "",

              hex: null,
            });

            return false;
          }

          /* ---------------------------------------
             Compile success
          --------------------------------------- */

          set({
            status: "compiled",

            hex: result.hex,

            logs:
              result.logs || "",

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

      /* ===============================================
         RUNNING
      =============================================== */

      setRunning: () => {
        set({
          status: "running",
          error: null,
        });
      },

      /* ===============================================
         STOP
      =============================================== */

      stop: () => {
        set({
          status: "stopped",
        });
      },

      /* ===============================================
         RESET
      =============================================== */

      reset: () => {
        set({
          status: "idle",
          hex: null,
          logs: "",
          error: null,
        });
      },
    })
  );