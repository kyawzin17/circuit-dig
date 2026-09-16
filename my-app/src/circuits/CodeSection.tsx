import Editor from "@monaco-editor/react";
import { Maximize } from "lucide-react";
import { useState } from "react";
import { ArrowDown } from "lucide-react";

import {
  useSimulationStore,
} from "../stores/simulationStore";

const CodeSection = ({ show, setShow }: { show: boolean; setShow: (show: boolean) => void }) => {

  const [fullScreen, setFullScreen] = useState(false);
  
  const code =
    useSimulationStore(
      (state) => state.code
    );

  const setCode =
    useSimulationStore(
      (state) => state.setCode
    );

  const compile =
    useSimulationStore(
      (state) => state.compile
    );

  const status =
    useSimulationStore(
      (state) => state.status
    );

  const error =
    useSimulationStore(
      (state) => state.error
    );

  const logs =
    useSimulationStore(
      (state) => state.logs
    );

  const isCompiling =
    status === "compiling";

  const handleRun = async () => {
    await compile();
  };
  const fullscreenFunction = () => {
    setFullScreen(!fullScreen);
  };
  return (
    <div className={`flex w-full ${fullScreen ? "h-screen" : "h-125"} flex-col overflow-hidden z-51 rounded-lg absolute left-0 border border-slate-700 bg-slate-900 transition-all duration-300 ease-in-out ${show ? "bottom-0" : "-bottom-full"}`}>
      
      {/* ============================================
          HEADER
      ============================================ */}

      <div className="flex items-center justify-between border-b border-slate-700 bg-gray-800 px-4 py-2">

        <span className="text-sm font-semibold text-white">
          ကုဒ်ရေးရန်နေရာ (Sketch.ino)
        </span>

        <div>
          <button onClick={() => setShow(!show)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-500 hover:text-slate-100 hover:transition-all hover:translate-y-1 duration-300 ease-in-out">
            <ArrowDown />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Fit View */}
                  <button
                    type="button"
                    onClick={fullscreenFunction}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-500 hover:text-slate-100"
                    title="Fullscreen"
                  >
                    <Maximize size={17} />
                  </button>
          
          <button
            type="button"
            onClick={handleRun}
            disabled={isCompiling}
            className={`rounded px-3 py-2 text-xs font-medium transition ${
              isCompiling
                ? "cursor-not-allowed bg-yellow-600 text-white"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isCompiling
              ? "Compiling..."
              : "Run"}
          </button>
        </div>
        
      </div>

      {/* ============================================
          EDITOR
      ============================================ */}

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="cpp"
          value={code}
          onChange={(value) => {
            setCode(value ?? "");
          }}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: {
              enabled: false,
            },
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* ============================================
          STATUS
      ============================================ */}

      <div className="border-t border-slate-700 bg-slate-950 px-4 py-2">

        <div className="flex items-center gap-2 text-xs">

          <span className="text-slate-400">
            Status:
          </span>

          <span
            className={
              status === "error"
                ? "text-red-400"
                : status === "compiled"
                  ? "text-green-400"
                  : status === "compiling"
                    ? "text-yellow-400"
                    : "text-slate-300"
            }
          >
            {status}
          </span>
        </div>

        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-red-400">
            {error}
          </pre>
        )}

        {/* ==========================================
            LOGS
        ========================================== */}

        {!error && logs && (
          <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-slate-400">
            {logs}
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeSection;