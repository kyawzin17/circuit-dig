import Editor from '@monaco-editor/react';

const CodeSection = () => {
  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
        <span className="text-sm font-semibold">ကုဒ်ရေးရန်နေရာ (Sketch.ino)</span>
        <button className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs">
          စမ်းသပ်မည် (Run)
        </button>
      </div>
      <Editor
        height="600px"
        defaultLanguage="cpp"
        defaultValue="// ကုဒ်များကို ဒီမှာ စတင်ရေးသားပါ..."
        theme="vs-dark"
        options={{ fontSize: 14, minimap: { enabled: false } }}
      />
    </div>
  );
};
export default CodeSection;