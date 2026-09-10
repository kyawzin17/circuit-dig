import { useEffect, useMemo, useState } from "react";
import type { Edge, Node } from "reactflow";

import { getPinIdFromHandle } from "./utils/pin.utils";

import {
  Search,
  Plug,
  Cable,
  Cpu,
  CircleDot,
  Zap,
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


type ConnectedPinInfo = {
  edgeId: string;
  nodeId: string;
  nodeLabel: string;
  pin: string;
};


type Props = {
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
  setConnected: (connected: boolean) => void;
};


// =====================================================
// PIN NORMALIZATION
//
// Handle IDs and CircuitPin IDs may not always match.
//
// Examples:
//
// pin.id       = "digital-13"
// pin.label    = "D13"
// handle       = "D13"
//
// pin.id       = "terminal-a"
// pin.label    = "A"
// handle       = "A-target"
//
// This normalization allows them to be compared safely.
// =====================================================

const normalizePinId = (
  value: string | null | undefined
): string => {

  if (!value) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[-_\s]/g, "");
};


// =====================================================
// GET CANONICAL PIN ID FROM HANDLE
// =====================================================

const getCanonicalHandlePinId = (
  handleId: string | null | undefined
): string => {
  if (!handleId) {
    return "";
  }

  let value = handleId.trim();

  // React Flow handle suffixes
  value = value
    .replace(/-source$/i, "")
    .replace(/-target$/i, "");

  // Other possible suffix formats
  value = value
    .replace(/:source$/i, "")
    .replace(/:target$/i, "");

  return normalizePinId(value);
};


// =====================================================
// GET ALL POSSIBLE PIN IDENTIFIERS
//
// Example:
//
// {
//   id: "digital-13",
//   label: "D13",
//   alias: "TX"
// }
//
// becomes:
//
// ["DIGITAL13", "D13", "TX"]
// =====================================================

const getPinIdentifiers = (
  pin: CircuitPin
): string[] => {

  const identifiers = [
    normalizePinId(pin.id),
    normalizePinId(pin.label),
  ];


  if (pin.alias) {
    identifiers.push(
      normalizePinId(pin.alias)
    );
  }


  return identifiers.filter(
    Boolean
  );
};


// =====================================================
// CHECK HANDLE BELONGS TO PIN
// =====================================================

const isHandleMatchingPin = (
  handleId: string | null | undefined,
  pin: CircuitPin
): boolean => {

  const normalizedHandle =
    getCanonicalHandlePinId(
      handleId
    );


  if (!normalizedHandle) {
    return false;
  }


  const pinIdentifiers =
    getPinIdentifiers(pin);

    console.log("PIN MATCH DEBUG", {
    handleId,
    normalizedHandle,
    pinId: pin.id,
    pinLabel: pin.label,
    pinIdentifiers,
  });


  return pinIdentifiers.includes(
    normalizedHandle
  );
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
// PIN GROUPS
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
    label: "Component Terminals",
  },
];


// =====================================================
// COMPONENT
// =====================================================

export default function PinPlanes({
  selectedNode,
  setConnected,
  nodes,
  edges,
}: Props) {

  // =====================================================
  // STATE
  // =====================================================

  const [search, setSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<PinFilter>("all");


  // =====================================================
  // GET SELECTED NODE PINS
  // =====================================================

  const pins = useMemo<CircuitPin[]>(() => {

    if (!selectedNode) {
      return [];
    }


    return (
      (selectedNode.data?.pins as CircuitPin[]) ||
      []
    );

  }, [
    selectedNode,
  ]);


  // =====================================================
  // GET CONNECTIONS FOR PIN
  //
  // IMPORTANT:
  //
  // A wire can be:
  //
  // Arduino D13
  //     SOURCE
  //        ↓
  // Resistor A
  //     TARGET
  //
  // OR:
  //
  // Resistor B
  //     SOURCE
  //        ↓
  // Arduino D12
  //     TARGET
  //
  // Therefore we MUST check BOTH source and target.
  // =====================================================

  const getPinConnections = (
    nodeId: string,
    pin: CircuitPin
  ): Edge[] => {

    return edges.filter(
      (edge) => {

        // =========================================
        // CURRENT NODE IS SOURCE
        // =========================================

        const isSourcePin =

          edge.source === nodeId &&

          isHandleMatchingPin(
            edge.sourceHandle,
            pin
          );


        // =========================================
        // CURRENT NODE IS TARGET
        // =========================================

        const isTargetPin =

          edge.target === nodeId &&

          isHandleMatchingPin(
            edge.targetHandle,
            pin
          );


        return (
          isSourcePin ||
          isTargetPin
        );

      }
    );

  };


  // =====================================================
  // GET CONNECTED COMPONENT INFORMATION
  // =====================================================

  const getConnectedInfo = (
    pin: CircuitPin
  ): ConnectedPinInfo[] => {

    if (!selectedNode) {
      return [];
    }


    const connections =
      getPinConnections(
        selectedNode.id,
        pin
      );


    return connections.map(
      (edge) => {

        // =========================================
        // DETERMINE WHICH SIDE IS SELECTED PIN
        // =========================================

        const currentNodeIsSource =

          edge.source === selectedNode.id &&

          isHandleMatchingPin(
            edge.sourceHandle,
            pin
          );


        // =========================================
        // GET OTHER NODE ID
        // =========================================

        const otherNodeId =
          currentNodeIsSource
            ? edge.target
            : edge.source;


        // =========================================
        // GET OTHER HANDLE ID
        // =========================================

        const otherHandleId =
          currentNodeIsSource
            ? edge.targetHandle
            : edge.sourceHandle;


        // =========================================
        // FIND OTHER NODE
        // =========================================

        const otherNode =
          nodes.find(
            (node) =>
              node.id === otherNodeId
          );


        // =========================================
        // GET OTHER PIN ID
        // =========================================

        const otherPinId =
          getCanonicalHandlePinId(
            otherHandleId
          );


        return {

          edgeId:
            edge.id,


          nodeId:
            otherNodeId,


          nodeLabel:
            String(
              otherNode?.data?.label ||
              otherNode?.data?.componentType ||
              otherNodeId
            ),


          pin:
            otherPinId ||
            "Unknown",

        };

      }
    );

  };


  // =====================================================
  // FILTER FUNCTION
  // =====================================================

  const matchesFilter = (
    pin: CircuitPin
  ): boolean => {

    // =========================================
    // ALL
    // =========================================

    if (
      activeFilter === "all"
    ) {
      return true;
    }


    // =========================================
    // MAIN PIN TYPE
    // =========================================

    if (
      pin.type === activeFilter
    ) {
      return true;
    }


    // =========================================
    // PIN FEATURES
    // =========================================

    if (
      pin.features?.includes(
        activeFilter as PinFeature
      )
    ) {
      return true;
    }


    // =========================================
    // PIN PROTOCOLS
    // =========================================

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


      return pins.filter(
        (pin) => {

          // =====================================
          // SEARCH
          // =====================================

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


          // =====================================
          // FILTER
          // =====================================

          const filterMatch =
            matchesFilter(pin);


          return (
            searchMatch &&
            filterMatch
          );

        }
      );

    }, [
      pins,
      search,
      activeFilter,
    ]);


  // =====================================================
  // PIN CONNECTION MAP
  //
  // Each pin's connections are calculated once.
  // =====================================================

  const pinConnectionsMap =
    useMemo(() => {

      const map =
        new Map<
          string,
          Edge[]
        >();


      if (!selectedNode) {
        return map;
      }


      pins.forEach(
        (pin) => {

          const connections =
            getPinConnections(
              selectedNode.id,
              pin
            );


          map.set(
            pin.id,
            connections
          );

        }
      );


      return map;

    }, [
      selectedNode,
      pins,
      edges,
    ]);


  // =====================================================
  // CONNECTED COUNT
  //
  // Count pins, NOT wires.
  //
  // Example:
  //
  // D13 → 2 wires
  //
  // Connected count = 1
  // =====================================================

  const connectedCount =
    useMemo(() => {

      return pins.filter(
        (pin) => {

          const connections =
            pinConnectionsMap.get(
              pin.id
            );


          return Boolean(
            connections &&
            connections.length > 0
          );

        }
      ).length;

    }, [
      pins,
      pinConnectionsMap,
    ]);

    useEffect(() => {
      setConnected(
        connectedCount > 0
      );
    }, [connectedCount, setConnected]);

  // =====================================================
  // FREE COUNT
  // =====================================================

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
            className="
              text-slate-500
            "
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

        {filters.map(
          (filter) => {

            const isActive =
              activeFilter ===
              filter.id;


            return (

              <button
                key={filter.id}

                type="button"

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

          }
        )}

      </div>


      {/* =============================================
          PIN GROUPS
      ============================================= */}

      <div
        className="
          space-y-5
        "
      >

        {pinGroups.map(
          (group) => {

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

                      // =============================
                      // GET CONNECTIONS
                      // =============================

                      const connections =
                        pinConnectionsMap.get(
                          pin.id
                        ) || [];


                      const isConnected =
                        connections.length > 0;


                      const connectedInfo =
                        isConnected
                          ? getConnectedInfo(
                              pin
                            )
                          : [];


                      return (

                        <div
                          key={pin.id}

                          className={`
                            bg-slate-800/50
                            border
                            rounded-lg
                            p-3
                            transition-all

                            ${
                              isConnected
                                ? `
                                  border-cyan-500/20
                                  hover:border-cyan-500/40
                                `
                                : `
                                  border-slate-700/60
                                  hover:border-slate-600
                                `
                            }
                          `}
                        >

                          {/* PIN HEADER */}

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
                                      ? `
                                        bg-cyan-400
                                        shadow-[0_0_8px_rgba(34,211,238,0.7)]
                                      `
                                      : `
                                        bg-slate-600
                                      `
                                  }
                                `}
                              />


                              {/* PIN LABEL */}

                              <span
                                className="
                                  text-sm
                                  font-bold
                                  text-white
                                "
                              >
                                {pin.label}
                              </span>


                              {/* PIN ALIAS */}

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


                          {/* FEATURES / PROTOCOLS */}

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

                              {pin.features?.map(
                                (feature) => (

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


                              {pin.protocols?.map(
                                (protocol) => (

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


                          {/* CONNECTED COMPONENTS */}

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
                                          bg-cyan-500/10
                                          px-1.5
                                          py-0.5
                                          rounded
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

          }
        )}

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