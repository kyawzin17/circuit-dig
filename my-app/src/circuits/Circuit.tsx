import CircuitEditor from "./CircuitEditor";
import { ReactFlowProvider } from "reactflow";

// import CodeSection from "./CodeSection";

const Circuit = () => {

return (
  <div className="w-full min-h-screen overflow-hidden relative flex flex-col">
    <ReactFlowProvider>
        <CircuitEditor />
     </ReactFlowProvider>
        {/* <CodeSection /> */}
  </div>
);
};
export default Circuit;