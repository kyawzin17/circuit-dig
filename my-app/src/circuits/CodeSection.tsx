import Editor from "@monaco-editor/react";
import { Maximize, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "../stores/simulationStore";

type CodeSectionProps = {
  show: boolean;
  setShow: (show: boolean) => void;
  onRun: () => void | Promise<void>;
  onStop: () => void;
};

const CodeSection = ({
  show,
  setShow,
  onRun,
  onStop,
}: CodeSectionProps) => {
  const [fullScreen, setFullScreen] = useState(false);

  const code = useSimulationStore((state) => state.code);
  const setCode = useSimulationStore((state) => state.setCode);
  const status = useSimulationStore((state) => state.status);
  const error = useSimulationStore((state) => state.error);
  const logs = useSimulationStore((state) => state.logs);

  const isCompiling = status === "compiling";
  const isRunning = status === "running";

  return (
    <div
      className={`flex w-full ${
        fullScreen ? "h-screen" : "h-125"
      } flex-col overflow-hidden z-51 rounded-lg absolute left-0 border border-slate-700 bg-slate-900 transition-all duration-300 ease-in-out ${
        show ? "bottom-0" : "-bottom-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-700 bg-gray-800 px-4 py-2">
        <span className="text-sm font-semibold text-white">
          ကုဒ်ရေးရန်နေရာ (Sketch.ino)
        </span>

        <button
          onClick={() => setShow(!show)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-500 hover:text-slate-100"
          title="Close code editor"
        >
          <ArrowDown />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullScreen((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-500 hover:text-slate-100"
            title="Fullscreen"
          >
            <Maximize size={17} />
          </button>

          <button
            type="button"
            onClick={() => void onRun()}
            disabled={isCompiling}
            className={`rounded px-3 py-2 text-xs font-medium transition ${
              isCompiling
                ? "cursor-not-allowed bg-yellow-600 text-white"
                : isRunning
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isCompiling ? "Compiling..." : isRunning ? "Running" : "Run"}
          </button>

          {isRunning && (
            <button
              type="button"
              onClick={onStop}
              className="rounded bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="cpp"
          value={code}
          onChange={(value) => setCode(value ?? "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      <div className="border-t border-slate-700 bg-slate-950 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Status:</span>
          <span
            className={
              status === "error"
                ? "text-red-400"
                : status === "compiled" || status === "running"
                  ? "text-green-400"
                  : status === "compiling"
                    ? "text-yellow-400"
                    : "text-slate-300"
            }
          >
            {status}
          </span>
        </div>

        {error && (
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-red-400">
            {error}
          </pre>
        )}

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
