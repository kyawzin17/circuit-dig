import CircuitEditor from "./CircuitEditor";
// import CodeSection from "./CodeSection";

const Circuit = () => {

return (
  <div className="w-full min-h-screen relative flex flex-col">
        <header className="w-full h-12 bg-slate-600 flex items-center justify-between px-4 md:px-12 absolute top-0 left-0 z-100">
            <h3 className="font-bold font-serif text-white text-2xl">Circuit Editor</h3>
            <div>
              <h3>Hello</h3>
            </div>
      </header>
        <CircuitEditor />
        {/* <CodeSection /> */}
  </div>
);
};
export default Circuit;