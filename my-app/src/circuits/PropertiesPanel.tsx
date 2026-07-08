import { MdDelete } from "react-icons/md";
import "./circuit.css";

type Props = {
  selectedNode: any;
};

export default function PropertiesPanel({
  selectedNode,
}: Props) {
  if (!selectedNode) {
    return (
      <>
      </>
    );
  }

  return (
    <div className="w-80 h-[80%] bg-slate-900 fixed overflow-y-auto custom-scrollbar -right-1 top-1/2 -translate-y-1/2 border-3 rounded-md border-green p-4">
      <h2 className="font-bold font-serif text-white text-2xl">{selectedNode.data.label}</h2>
      <div className="w-[90%] mx-auto h-px bg-white my-4"></div>

      <button className="w-full py-2 bg-blue-500 rounded-lg hover:bg-blue-600 text-md font-serif font-md cursor-pointer text-white">
        Component Documentation
      </button>
      <p>ID : {selectedNode.id}</p>

      <p>Type : {selectedNode.type}</p>
    </div>
  );
}