import { MdDelete } from "react-icons/md";
import "./circuit.css";

type Props = {
  selectedNode: any;
  onDelete: (id: string) => void;
  onRotate: (id: string) => void; // Prop အသစ်လက်ခံမယ်
};

export default function PropertiesPanel({
  selectedNode,
  onDelete,
  onRotate
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
      {/* 🌟 လှည့်မယ့် Button */}
        <button
          onClick={() => onRotate(selectedNode.id)}
          className="w-full cursor-pointer bg-cyan-50 hover:bg-cyan-500 hover:text-white text-cyan-600 border border-cyan-200 text-sm py-1.5 px-3 rounded-lg transition-colors font-medium"
        >
          🔄 ၉၀ ဒီဂရီ လှည့်မည်
        </button>
      <button
        onClick={() => onDelete(selectedNode.id)}
        className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex justify-center items-center"
      >
        <MdDelete  className="text-xl"/> <span>ဖျတ်မည်!</span>
      </button>
    </div>
  );
}