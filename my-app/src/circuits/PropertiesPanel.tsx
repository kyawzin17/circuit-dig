import { useEffect, useState } from "react";
import {
  Pencil,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Trash2,
  X,
} from "lucide-react";

import type { Node, Edge } from "reactflow";
import PinPlanes from "./PinPlanes";

type Props = {
  nodes: Node[];
  edges: Edge[];

  selectedNode: Node;

  onRename?: (
    nodeId: string,
    newName: string
  ) => void;

  onUpdateNode?: (
    nodeId: string,
    updates: any
  ) => void;

  onDelete?: (
    nodeId: string
  ) => void;

  onDocumentation?: (
    componentType: string
  ) => void;

  rotateNode: (
    nodeId: string,
    rotation?: number
  ) => void;
};


export default function PropertiesPanel({
  selectedNode,
  onRename,
  onUpdateNode,
  onDelete,
  onDocumentation,
  rotateNode,
  nodes,
  edges,
}: Props) {

  const [activeTab, setActiveTab] =
    useState("properties");

  const [isEditingName, setIsEditingName] =
    useState(false);

  const [name, setName] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [additionalOpen, setAdditionalOpen] =
    useState(false);


  // =========================
  // Selected Node Change
  // =========================

  useEffect(() => {
    if (selectedNode) {

      setName(
        selectedNode.data?.label || ""
      );

      setIsEditingName(false);

      setActiveTab("properties");
    }
  }, [selectedNode]);


  if (!selectedNode) {
    return null;
  }


  // =========================
  // DATA
  // =========================

  const data = selectedNode.data || {};

  const label =
    data.label || "Unnamed Component";

  const componentType =
    data.componentType || selectedNode.type;

  const position =
    selectedNode.position || {
      x: 0,
      y: 0,
    };

  const rotation =
    data.rotation ?? 0;


  // =========================
  // RENAME
  // =========================

  const handleSaveName = () => {

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return;
    }

    onRename?.(
      selectedNode.id,
      trimmedName
    );

    setIsEditingName(false);
  };


  const handleCancelName = () => {

    setName(label);

    setIsEditingName(false);
  };


  // =========================
  // COPY ID
  // =========================

  const handleCopyId = async () => {

    try {

      await navigator.clipboard.writeText(
        selectedNode.id
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);

    } catch (error) {
      console.error(error);
    }
  };


  // =========================
  // UPDATE POSITION
  // =========================

  // const handlePositionChange = (
  //   axis: "x" | "y",
  //   value: string
  // ) => {

  //   const numberValue =
  //     Number(value);

  //   if (Number.isNaN(numberValue)) {
  //     return;
  //   }

  //   onUpdateNode?.(
  //     selectedNode.id,
  //     {
  //       position: {
  //         ...position,
  //         [axis]: numberValue,
  //       },
  //     }
  //   );
  // };


  // =========================
  // UPDATE ROTATION
  // =========================

  // const handleRotationChange = (
  //   value: number
  // ) => {

  //   onUpdateNode?.(
  //     selectedNode.id,
  //     {
  //       data: {
  //         rotation: value,
  //       },
  //     }
  //   );
  // };

  if (!selectedNode) {
    return null;
  }


  return (
    <aside
      className="
        w-[320px]
        h-[calc(100vh-48px)]
        fixed
        custom-scrollbar 
        -right-1 top-12 border-3 rounded-md border-green
        bg-[#0d1726]
        border-l
        border-[#1e3148]
        overflow-y-auto
        custom-scrollbar
        text-slate-200
      "
    >

      {/* =================================
          HEADER
      ================================= */}

      <div className="p-4 border-b border-[#1e3148]">

        <div className="flex items-center gap-2 mb-4">

          <div
            className="
              w-5
              h-5
              flex
              items-center
              justify-center
              text-slate-400
            "
          >
            ⚯
          </div>

          <span
            className="
              text-[10px]
              tracking-[0.15em]
              text-slate-400
              uppercase
            "
          >
            Component
          </span>

        </div>


        <div className="flex gap-3">

          {/* Component Preview */}

          <div
            className="
              w-16
              h-16
              shrink-0
              rounded-md
              border
              border-[#263b55]
              bg-[#101d2e]
              flex
              items-center
              justify-center
              overflow-hidden
            "
          >

            {data.image ? (

              <img
                src={data.image}
                alt={label}
                className="
                  max-w-[90%]
                  max-h-[90%]
                  object-contain
                "
              />

            ) : (

              <div
                className="
                  w-10
                  h-10
                  rounded
                  bg-[#17304a]
                  flex
                  items-center
                  justify-center
                  text-[10px]
                  text-slate-400
                "
              >
                {componentType
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

            )}

          </div>


          {/* Component Name */}

          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-2">

              <h2
                className="
                  text-lg
                  font-bold
                  text-white
                  truncate
                "
              >
                {name}
              </h2>

              <button
                onClick={() =>
                  setIsEditingName(true)
                }
                className="
                  shrink-0
                  text-slate-400
                  hover:text-blue-400
                  transition
                "
                title="Rename component"
              >
                <Pencil size={15} />
              </button>

            </div>


            <p
              className="
                text-xs
                text-slate-500
                mt-1
              "
            >
              {componentType}
            </p>


            {/* Status */}

            <div
              className="
                flex
                items-center
                gap-2
                mt-2
              "
            >

              <span
                className="
                  w-2
                  h-2
                  rounded-full
                  bg-emerald-400
                "
              />

              <span
                className="
                  text-xs
                  text-emerald-400
                "
              >
                Connected
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* =================================
          TABS
      ================================= */}

      <div
        className="
          grid
          grid-cols-3
          border-b
          border-[#1e3148]
        "
      >

        <TabButton
          active={activeTab === "properties"}
          onClick={() =>
            setActiveTab("properties")
          }
        >
          Properties
        </TabButton>


        <TabButton
          active={activeTab === "pins"}
          onClick={() =>
            setActiveTab("pins")
          }
        >
          Pins
        </TabButton>


        <TabButton
          active={activeTab === "info"}
          onClick={() =>
            setActiveTab("info")
          }
        >
          Info
        </TabButton>

      </div>


      {/* =================================
          CONTENT
      ================================= */}

      <div className="p-4">


        {/* =================================
            PROPERTIES TAB
        ================================= */}

        {activeTab === "properties" && (

          <>

            {/* BASIC */}

            <SectionTitle>
              Basic
            </SectionTitle>


            {/* NAME */}

            <PropertyRow
              label="Name"
            >

              {!isEditingName ? (

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    w-full
                    px-3
                    py-2
                    rounded-md
                    bg-[#111e2f]
                    border
                    border-[#29405b]
                  "
                >

                  <span
                    className="
                      text-xs
                      text-slate-200
                      truncate
                    "
                  >
                    {name}
                  </span>


                  <button
                    onClick={() =>
                      setIsEditingName(true)
                    }
                    className="
                      text-slate-400
                      hover:text-blue-400
                    "
                  >
                    <Pencil size={14} />
                  </button>

                </div>

              ) : (

                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >

                  <input
                    autoFocus
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {

                      if (
                        event.key === "Enter"
                      ) {
                        handleSaveName();
                      }

                      if (
                        event.key === "Escape"
                      ) {
                        handleCancelName();
                      }

                    }}
                    className="
                      flex-1
                      min-w-0
                      px-3
                      py-2
                      text-xs
                      text-white
                      bg-[#111e2f]
                      border
                      border-blue-500
                      rounded-md
                      outline-none
                    "
                  />


                  <button
                    onClick={handleSaveName}
                    className="
                      p-2
                      text-emerald-400
                      hover:bg-emerald-500/10
                      rounded
                    "
                  >
                    <Check size={15} />
                  </button>


                  <button
                    onClick={handleCancelName}
                    className="
                      p-2
                      text-red-400
                      hover:bg-red-500/10
                      rounded
                    "
                  >
                    <X size={15} />
                  </button>

                </div>

              )}

            </PropertyRow>


            {/* COMPONENT TYPE */}

            <PropertyRow
              label="Component Type"
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  px-3
                  py-2
                  mt-px
                  rounded-md
                  bg-[#111e2f]
                  border
                  border-[#29405b]
                  text-xs
                  text-slate-300
                "
              >

                <span>
                  {componentType}
                </span>

                {/* <ChevronDown size={14} /> */}

              </div>

            </PropertyRow>


            {/* ID */}

            <PropertyRow
              label="ID"
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <div
                  className="
                    flex-1
                    min-w-0
                    px-3
                    py-2
                    rounded-md
                    bg-[#111e2f]
                    border
                    border-[#29405b]
                    text-xs
                    text-slate-400
                    truncate
                  "
                >
                  {selectedNode.id}
                </div>


                <button
                  onClick={handleCopyId}
                  className="
                    p-2
                    rounded-md
                    border
                    border-[#29405b]
                    text-slate-400
                    hover:text-white
                    hover:bg-[#17283d]
                  "
                >
                  {copied
                    ? <Check size={15} />
                    : <Copy size={15} />
                  }
                </button>

              </div>

            </PropertyRow>


            {/* =================================
                TRANSFORM
            ================================= */}

            <div className="mt-6">

              {/* <SectionTitle>
                Transform
              </SectionTitle>

              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                "
              >

                <NumberInput
                  label="Position X"
                  value={position.x}
                  onChange={(value) =>
                    handlePositionChange(
                      "x",
                      value
                    )
                  }
                />


                <NumberInput
                  label="Position Y"
                  value={position.y}
                  onChange={(value) =>
                    handlePositionChange(
                      "y",
                      value
                    )
                  }
                />

              </div> */}


              {/* Rotation */}

              <div className="mt-4">

                <p
                  className="
                    text-xs
                    text-slate-400
                    mb-2
                  "
                >
                  Rotation
                </p>


                <div
                  className="
                    grid
                    grid-cols-5
                    gap-2
                  "
                >

                  {[0, 90, 180, 270, 360].map(
                    (value) => {

                      const active =
                        rotation === value;

                      return (

                        <button
                          key={value}
                          onClick={() =>
                            rotateNode(
                              selectedNode.id,
                              value
                            )
                          }
                          className={`
                            py-2
                            rounded-md
                            text-[10px]
                            border
                            transition
                            ${
                              active
                                ? `
                                  bg-blue-500/20
                                  border-blue-500
                                  text-blue-400
                                `
                                : `
                                  bg-[#111e2f]
                                  border-[#29405b]
                                  text-slate-400
                                  hover:border-blue-500/50
                                `
                            }
                          `}
                        >
                          {value}°
                        </button>

                      );
                    }
                  )}

                </div>

              </div>

            </div>


            {/* =================================
                BOARD SETTINGS
            ================================= */}

            {isArduino(componentType) && (

              <div className="mt-6">

                <SectionTitle>
                  Board Settings
                </SectionTitle>


                <SelectLike
                  label="Microcontroller"
                  value={
                    data.microcontroller ||
                    "ATmega328P"
                  }
                />


                <SelectLike
                  label="Clock Speed"
                  value={
                    data.clockSpeed ||
                    "16 MHz"
                  }
                />

              </div>

            )}


            {/* =================================
                ADDITIONAL SETTINGS
            ================================= */}

            <button
              onClick={() =>
                setAdditionalOpen(
                  !additionalOpen
                )
              }
              className="
                w-full
                mt-5
                flex
                items-center
                gap-2
                py-3
                text-xs
                uppercase
                tracking-wide
                text-slate-400
                border-t
                border-b
                border-[#1e3148]
              "
            >

              {additionalOpen
                ? <ChevronDown size={15} />
                : <ChevronRight size={15} />
              }

              Additional Settings

            </button>


            {additionalOpen && (

              <div
                className="
                  mt-4
                  p-3
                  rounded-md
                  bg-[#111e2f]
                  border
                  border-[#263b55]
                "
              >

                <p
                  className="
                    text-xs
                    text-slate-400
                  "
                >
                  Additional component
                  settings will appear here.
                </p>

              </div>

            )}


            {/* =================================
                ACTIONS
            ================================= */}

            <div className="mt-6 space-y-3">

              <button
                onClick={() =>
                  onDocumentation?.(
                    componentType
                  )
                }
                className="
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  py-3
                  rounded-md
                  bg-blue-600
                  hover:bg-blue-500
                  text-white
                  text-sm
                  font-semibold
                  transition
                "
              >

                <BookOpen size={16} />

                Component Documentation

              </button>


              <button
                onClick={() =>
                  onDelete?.(
                    selectedNode.id
                  )
                }
                className="
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  py-3
                  rounded-md
                  border
                  border-red-500/60
                  text-red-400
                  hover:bg-red-500/10
                  text-sm
                  font-semibold
                  transition
                "
              >

                <Trash2 size={16} />

                Delete Component

              </button>

            </div>

          </>

        )}


        {/* =================================
            PINS TAB
        ================================= */}

        {/* Pins */}

        {activeTab === "pins" && (

          <PinPlanes
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
          />

        )}


        {/* =================================
            INFO TAB
        ================================= */}

        {activeTab === "info" && (

          <InfoTab
            selectedNode={selectedNode}
          />

        )}

      </div>

    </aside>
  );
}


/* =====================================
   SMALL COMPONENTS
===================================== */


type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function TabButton({
  active,
  onClick,
  children,
}: TabButtonProps) {

  return (

    <button
      onClick={onClick}
      className={`
        relative
        py-3
        text-xs
        font-medium
        transition

        ${
          active
            ? "text-blue-400"
            : "text-slate-500 hover:text-slate-300"
        }
      `}
    >

      {children}

      {active && (

        <span
          className="
            absolute
            bottom-0
            left-0
            w-full
            h-0.5
            bg-blue-500
          "
        />

      )}

    </button>

  );
}


function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {

  return (

    <h3
      className="
        text-xs
        uppercase
        tracking-wider
        text-slate-400
        font-semibold
        mb-4
      "
    >
      {children}
    </h3>

  );
}


function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {

  return (

    <div className="mb-4">

      <p
        className="
          text-xs
          text-slate-400
          mb-2
        "
      >
        {label}
      </p>

      {children}

    </div>

  );
}


function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {

  return (

    <div>

      <p
        className="
          text-xs
          text-slate-400
          mb-2
        "
      >
        {label}
      </p>


      <input
        type="number"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          w-full
          px-3
          py-2
          text-xs
          text-slate-200
          bg-[#111e2f]
          border
          border-[#29405b]
          rounded-md
          outline-none
          focus:border-blue-500
        "
      />

    </div>

  );
}


function SelectLike({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div className="mb-4">

      <p
        className="
          text-xs
          text-slate-400
          mb-2
        "
      >
        {label}
      </p>


      <div
        className="
          flex
          items-center
          justify-between
          px-3
          py-2
          bg-[#111e2f]
          border
          border-[#29405b]
          rounded-md
          text-xs
          text-slate-300
        "
      >

        <span>
          {value}
        </span>

        <ChevronDown size={14} />

      </div>

    </div>

  );
}


/* =====================================
   PINS TAB
===================================== */

function PinsTab({
  selectedNode,
}: {
  selectedNode: any;
}) {

  const pins =
    selectedNode.data?.pins || [];

  return (

    <div>

      <SectionTitle>
        Pins
      </SectionTitle>


      {pins.length === 0 ? (

        <div
          className="
            py-10
            text-center
            text-sm
            text-slate-500
          "
        >
          No pin data available
        </div>

      ) : (

        <div className="space-y-2">

          {pins.map(
            (pin: any) => (

              <div
                key={pin.id}
                className="
                  flex
                  items-center
                  justify-between
                  p-3
                  rounded-md
                  bg-[#111e2f]
                  border
                  border-[#263b55]
                "
              >

                <span className="text-xs text-white">
                  {pin.name}
                </span>


                <span
                  className={`
                    text-[10px]

                    ${
                      pin.connected
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }
                  `}
                >
                  {pin.connected
                    ? "Connected"
                    : "Available"}
                </span>

              </div>

            )
          )}

        </div>

      )}

    </div>

  );
}


/* =====================================
   INFO TAB
===================================== */

function InfoTab({
  selectedNode,
}: {
  selectedNode: any;
}) {

  const data =
    selectedNode.data || {};

  return (

    <div>

      <SectionTitle>
        Component Information
      </SectionTitle>


      <div
        className="
          space-y-4
          text-sm
        "
      >

        <InfoRow
          label="Name"
          value={data.label}
        />


        <InfoRow
          label="Type"
          value={
            data.componentType
          }
        />


        <InfoRow
          label="ID"
          value={
            selectedNode.id
          }
        />

      </div>

    </div>

  );
}


function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (

    <div>

      <p
        className="
          text-xs
          text-slate-500
          mb-1
        "
      >
        {label}
      </p>

      <p
        className="
          text-sm
          text-slate-200
          break-all
        "
      >
        {value}
      </p>

    </div>

  );
}


/* =====================================
   HELPERS
===================================== */

function isArduino(
  componentType: string
) {

  return componentType
    ?.toLowerCase()
    .includes("arduino");

}

      