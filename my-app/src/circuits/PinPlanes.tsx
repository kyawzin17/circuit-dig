import { useMemo, useState } from "react";
import type { Edge, Node } from "reactflow";

import {
  Search,
  Plug,
  Cable,
  Cpu,
  CircleDot,
  Zap,
  Radio,
  Wifi,
} from "lucide-react";

import type {
  CircuitPin,
  PinFeature,
  PinProtocol,
  PinType,
} from "./types/pin.types";


// =====================================================
// TYPES
// =====================================================

type PinFilter =
  | "all"
  | PinType
  | PinFeature
  | PinProtocol;


type Props = {
  selectedNode: Node | null;

  nodes: Node[];

  edges: Edge[];
};


// =====================================================
// FILTER CONFIG
// =====================================================

const filters: {
  id: PinFilter;
  label: string;
}[] = [
  {
    id: "all",
    label: "All",
  },

  {
    id: "digital",
    label: "Digital",
  },

  {
    id: "analog",
    label: "Analog",
  },

  {
    id: "terminal",
    label: "Terminal",
  },

  {
    id: "pwm",
    label: "PWM",
  },

  {
    id: "i2c",
    label: "I2C",
  },

  {
    id: "spi",
    label: "SPI",
  },

  {
    id: "uart",
    label: "UART",
  },

  {
    id: "power",
    label: "Power",
  },

  {
    id: "ground",
    label: "Ground",
  },
];


// =====================================================
// GROUP CONFIG
// =====================================================

const pinGroups: {
  type: PinType;
  label: string;
}[] = [
  {
    type: "digital",
    label: "Digital Pins",
  },

  {
    type: "analog",
    label: "Analog Pins",
  },

  {
    type: "power",
    label: "Power Pins",
  },

  {
    type: "ground",
    label: "Ground Pins",
  },

  {
    type: "terminal",
    label: "Terminal Pins",
  }
];


// =====================================================
// COMPONENT
// =====================================================

export default function PinsPanel({
  selectedNode,
  nodes,
  edges,
}: Props) {

  const [search, setSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<PinFilter>("all");


  // =====================================================
  // GET PINS
  // =====================================================

  const pins = useMemo<CircuitPin[]>(() => {

    if (!selectedNode) {
      return [];
    }

    return (
      (selectedNode.data?.pins as CircuitPin[]) ||
      []
    );

  }, [selectedNode]);


  // =====================================================
  // GET CONNECTIONS
  // =====================================================

  const getPinConnections = (
    pinId: string
  ) => {

    if (!selectedNode) {
      return [];
    }

    return edges.filter((edge) => {

      const isSource =
        edge.source === selectedNode.id &&
        edge.sourceHandle === pinId;

      const isTarget =
        edge.target === selectedNode.id &&
        edge.targetHandle === pinId;

      return (
        isSource ||
        isTarget
      );

    });

  };


  // =====================================================
  // GET CONNECTED COMPONENT
  // =====================================================

  const getConnectedInfo = (
    pinId: string
  ) => {

    if (!selectedNode) {
      return [];
    }

    const connections =
      getPinConnections(pinId);


    return connections.map((edge) => {

      const isSource =
        edge.source === selectedNode.id &&
        edge.sourceHandle === pinId;


      const otherNodeId =
        isSource
          ? edge.target
          : edge.source;


      const otherPin =
        isSource
          ? edge.targetHandle
          : edge.sourceHandle;


      const otherNode =
        nodes.find(
          (node) =>
            node.id === otherNodeId
        );


      return {

        edgeId: edge.id,

        nodeId: otherNodeId,

        nodeLabel:
          String(
            otherNode?.data?.label ||
            otherNodeId
          ),

        pin:
          otherPin || "Unknown",

      };

    });

  };


  // =====================================================
  // FILTER FUNCTION
  // =====================================================

  const matchesFilter = (
    pin: CircuitPin
  ) => {

    if (
      activeFilter === "all"
    ) {
      return true;
    }


    // Main Pin Type
    if (
      pin.type === activeFilter
    ) {
      return true;
    }


    // Pin Features
    if (
      pin.features?.includes(
        activeFilter as PinFeature
      )
    ) {
      return true;
    }


    // Pin Protocols
    if (
      pin.protocols?.includes(
        activeFilter as PinProtocol
      )
    ) {
      return true;
    }


    return false;

  };


  // =====================================================
  // FILTERED PINS
  // =====================================================

  const filteredPins =
    useMemo(() => {

      const normalizedSearch =
        search
          .trim()
          .toLowerCase();


      return pins.filter((pin) => {

        const searchMatch =
          !normalizedSearch ||

          pin.label
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||

          pin.alias
            ?.toLowerCase()
            .includes(
              normalizedSearch
            ) ||

          pin.description
            ?.toLowerCase()
            .includes(
              normalizedSearch
            );


        const filterMatch =
          matchesFilter(pin);


        return (
          searchMatch &&
          filterMatch
        );

      });

    }, [
      pins,
      search,
      activeFilter,
    ]);


  // =====================================================
  // SUMMARY
  // =====================================================

  const connectedCount =
    pins.filter((pin) =>
      getPinConnections(
        pin.id
      ).length > 0
    ).length;


  const freeCount =
    pins.length -
    connectedCount;


  // =====================================================
  // EMPTY STATE
  // =====================================================

  if (!selectedNode) {

    return (

      <div
        className="
          h-full
          flex
          flex-col
          items-center
          justify-center
          text-center
          py-16
        "
      >

        <div
          className="
            w-12
            h-12
            rounded-xl
            bg-slate-800
            flex
            items-center
            justify-center
            mb-4
          "
        >

          <Plug
            size={22}
            className="text-slate-500"
          />

        </div>


        <p
          className="
            text-sm
            font-medium
            text-slate-400
          "
        >
          No Component Selected
        </p>


        <p
          className="
            text-xs
            text-slate-600
            mt-1
          "
        >
          Select a component to view its pins.
        </p>

      </div>

    );

  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div
      className="
        w-full
        text-white
        pb-4
      "
    >

      {/* =============================================
          HEADER
      ============================================= */}

      <div
        className="
          flex
          items-center
          gap-2
          mb-4
        "
      >

        <div
          className="
            w-7
            h-7
            rounded-md
            bg-cyan-500/10
            border
            border-cyan-500/20
            flex
            items-center
            justify-center
          "
        >

          <Plug
            size={14}
            className="
              text-cyan-400
            "
          />

        </div>


        <div>

          <h3
            className="
              text-xs
              font-bold
              tracking-wide
              text-slate-200
            "
          >
            PIN MANAGEMENT
          </h3>


          <p
            className="
              text-[10px]
              text-slate-500
              mt-0.5
            "
          >
            {String(
              selectedNode.data?.label
            )}
          </p>

        </div>

      </div>


      {/* =============================================
          SUMMARY
      ============================================= */}

      <div
        className="
          grid
          grid-cols-3
          gap-2
          mb-5
        "
      >

        {/* TOTAL */}

        <div
          className="
            bg-slate-800/60
            border
            border-slate-700/60
            rounded-lg
            py-3
            text-center
          "
        >

          <p
            className="
              text-lg
              font-bold
              text-white
            "
          >
            {pins.length}
          </p>


          <p
            className="
              text-[9px]
              uppercase
              tracking-wide
              text-slate-500
            "
          >
            Total
          </p>

        </div>


        {/* CONNECTED */}

        <div
          className="
            bg-slate-800/60
            border
            border-cyan-500/20
            rounded-lg
            py-3
            text-center
          "
        >

          <p
            className="
              text-lg
              font-bold
              text-cyan-400
            "
          >
            {connectedCount}
          </p>


          <p
            className="
              text-[9px]
              uppercase
              tracking-wide
              text-slate-500
            "
          >
            Connected
          </p>

        </div>


        {/* FREE */}

        <div
          className="
            bg-slate-800/60
            border
            border-slate-700/60
            rounded-lg
            py-3
            text-center
          "
        >

          <p
            className="
              text-lg
              font-bold
              text-emerald-400
            "
          >
            {freeCount}
          </p>


          <p
            className="
              text-[9px]
              uppercase
              tracking-wide
              text-slate-500
            "
          >
            Free
          </p>

        </div>

      </div>


      {/* =============================================
          SEARCH
      ============================================= */}

      <div
        className="
          relative
          mb-4
        "
      >

        <Search
          size={14}
          className="
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            text-slate-500
          "
        />


        <input
          value={search}

          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }

          placeholder="Search pin..."

          className="
            w-full
            h-9
            bg-[#0B1424]
            border
            border-slate-700
            rounded-lg
            pl-9
            pr-3
            text-xs
            text-white
            placeholder:text-slate-600
            outline-none
            transition-all
            focus:border-cyan-500
            focus:ring-1
            focus:ring-cyan-500/20
          "
        />

      </div>


      {/* =============================================
          FILTERS
      ============================================= */}

      <div
        className="
          flex
          gap-1.5
          overflow-x-auto
          pb-2
          mb-4
          custom-scrollbar
        "
      >

        {filters.map((filter) => {

          const isActive =
            activeFilter ===
            filter.id;


          return (

            <button
              key={filter.id}

              onClick={() =>
                setActiveFilter(
                  filter.id
                )
              }

              className={`
                flex-none
                px-2.5
                py-1.5
                rounded-md
                text-[9px]
                font-medium
                border
                transition-all
                cursor-pointer

                ${
                  isActive

                    ? `
                      bg-cyan-500/15
                      border-cyan-500/50
                      text-cyan-400
                    `

                    : `
                      bg-slate-800/50
                      border-slate-700/70
                      text-slate-500
                      hover:text-slate-300
                      hover:border-slate-600
                    `
                }
              `}
            >
              {filter.label}
            </button>

          );

        })}

      </div>


      {/* =============================================
          PIN GROUPS
      ============================================= */}

      <div
        className="
          space-y-5
        "
      >

        {pinGroups.map((group) => {

          const groupPins =
            filteredPins.filter(
              (pin) =>
                pin.type ===
                group.type
            );


          if (
            groupPins.length === 0
          ) {
            return null;
          }


          return (

            <section
              key={group.type}
            >

              {/* GROUP HEADER */}

              <div
                className="
                  flex
                  items-center
                  gap-2
                  mb-2
                "
              >

                <span
                  className="
                    text-[9px]
                    font-bold
                    tracking-[0.15em]
                    text-slate-500
                    uppercase
                    whitespace-nowrap
                  "
                >
                  {group.label}
                </span>


                <div
                  className="
                    h-px
                    flex-1
                    bg-slate-800
                  "
                />

              </div>


              {/* PIN LIST */}

              <div
                className="
                  space-y-2
                "
              >

                {groupPins.map(
                  (pin) => {

                    const connections =
                      getPinConnections(
                        pin.id
                      );


                    const isConnected =
                      connections.length >
                      0;


                    const connectedInfo =
                      getConnectedInfo(
                        pin.id
                      );


                    return (

                      <div
                        key={pin.id}

                        className="
                          bg-slate-800/50
                          border
                          border-slate-700/60
                          rounded-lg
                          p-3
                          transition-all
                          hover:border-slate-600
                        "
                      >

                        {/* TOP */}

                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-2
                          "
                        >

                          <div
                            className="
                              flex
                              items-center
                              gap-2
                              min-w-0
                            "
                          >

                            {/* STATUS DOT */}

                            <span
                              className={`
                                flex-none
                                w-2
                                h-2
                                rounded-full

                                ${
                                  isConnected
                                    ? "bg-cyan-400"
                                    : "bg-slate-600"
                                }
                              `}
                            />


                            {/* PIN NAME */}

                            <span
                              className="
                                text-sm
                                font-bold
                                text-white
                              "
                            >
                              {pin.label}
                            </span>


                            {/* ALIAS */}

                            {pin.alias && (

                              <span
                                className="
                                  text-[9px]
                                  px-1.5
                                  py-0.5
                                  rounded
                                  bg-slate-900
                                  text-slate-500
                                  border
                                  border-slate-800
                                  truncate
                                "
                              >
                                {pin.alias}
                              </span>

                            )}

                          </div>


                          {/* STATUS */}

                          <span
                            className={`
                              flex-none
                              text-[8px]
                              font-bold
                              tracking-wide
                              px-2
                              py-1
                              rounded

                              ${
                                isConnected

                                  ? `
                                    bg-cyan-500/10
                                    text-cyan-400
                                  `

                                  : `
                                    bg-slate-700/60
                                    text-slate-500
                                  `
                              }
                            `}
                          >

                            {isConnected
                              ? "CONNECTED"
                              : "FREE"}

                          </span>

                        </div>


                        {/* BADGES */}

                        {(
                          pin.features?.length ||
                          pin.protocols?.length
                        ) && (

                          <div
                            className="
                              flex
                              flex-wrap
                              gap-1.5
                              mt-2
                            "
                          >

                            {/* FEATURES */}

                            {pin.features?.map(
                              (feature: any) => (

                                <span
                                  key={feature}

                                  className="
                                    text-[8px]
                                    px-1.5
                                    py-0.5
                                    rounded
                                    bg-violet-500/10
                                    text-violet-400
                                    border
                                    border-violet-500/20
                                    uppercase
                                  "
                                >
                                  {feature}
                                </span>

                              )
                            )}


                            {/* PROTOCOLS */}

                            {pin.protocols?.map(
                              (protocol: any) => (

                                <span
                                  key={protocol}

                                  className="
                                    text-[8px]
                                    px-1.5
                                    py-0.5
                                    rounded
                                    bg-orange-500/10
                                    text-orange-400
                                    border
                                    border-orange-500/20
                                    uppercase
                                  "
                                >
                                  {protocol}
                                </span>

                              )
                            )}

                          </div>

                        )}


                        {/* VOLTAGE */}

                        {pin.voltage && (

                          <div
                            className="
                              flex
                              items-center
                              gap-1.5
                              mt-2
                              text-[10px]
                              text-yellow-400
                            "
                          >

                            <Zap
                              size={11}
                            />


                            <span>

                              {pin.voltage.nominal}

                              {pin.voltage.unit}

                            </span>

                          </div>

                        )}


                        {/* DESCRIPTION */}

                        {pin.description && (

                          <p
                            className="
                              mt-2
                              text-[10px]
                              leading-relaxed
                              text-slate-500
                            "
                          >
                            {pin.description}
                          </p>

                        )}


                        {/* CONNECTIONS */}

                        {isConnected && (

                          <div
                            className="
                              mt-3
                              pt-3
                              border-t
                              border-slate-700/50
                            "
                          >

                            <div
                              className="
                                flex
                                items-center
                                gap-1.5
                                mb-2
                                text-[9px]
                                font-medium
                                tracking-wide
                                text-slate-500
                              "
                            >

                              <Cable
                                size={11}
                              />

                              CONNECTED TO

                            </div>


                            <div
                              className="
                                space-y-1.5
                              "
                            >

                              {connectedInfo.map(
                                (
                                  connection
                                ) => (

                                  <div
                                    key={
                                      connection.edgeId
                                    }

                                    className="
                                      flex
                                      items-center
                                      justify-between
                                      gap-3
                                      bg-slate-900/50
                                      rounded-md
                                      px-2
                                      py-1.5
                                    "
                                  >

                                    <div
                                      className="
                                        flex
                                        items-center
                                        gap-1.5
                                        min-w-0
                                      "
                                    >

                                      <Cpu
                                        size={11}
                                        className="
                                          flex-none
                                          text-slate-500
                                        "
                                      />

                                      <span
                                        className="
                                          text-[10px]
                                          text-slate-300
                                          truncate
                                        "
                                      >
                                        {
                                          connection.nodeLabel
                                        }
                                      </span>

                                    </div>


                                    <span
                                      className="
                                        flex-none
                                        text-[9px]
                                        text-cyan-400
                                      "
                                    >
                                      {
                                        connection.pin
                                      }
                                    </span>

                                  </div>

                                )
                              )}

                            </div>

                          </div>

                        )}

                      </div>

                    );

                  }
                )}

              </div>

            </section>

          );

        })}

      </div>


      {/* =============================================
          EMPTY SEARCH
      ============================================= */}

      {filteredPins.length === 0 && (

        <div
          className="
            flex
            flex-col
            items-center
            justify-center
            text-center
            py-12
          "
        >

          <CircleDot
            size={26}
            className="
              text-slate-700
              mb-3
            "
          />


          <p
            className="
              text-xs
              text-slate-500
            "
          >
            No pins found
          </p>


          <p
            className="
              text-[10px]
              text-slate-600
              mt-1
            "
          >
            Try another search or filter.
          </p>

        </div>

      )}

    </div>

  );

}