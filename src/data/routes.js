// Daytime subway services and the track each one runs on.
//
// stops.json has station coordinates and which routes stop where, but not the
// order of stations along a line. Each path below is an ordered list of
// gtfs_stop_ids along the physical track, including stations an express train
// passes without stopping, so routes sharing track share map segments.
// Which routes actually stop at a station comes from stops.json (daytime_routes).
//
// Paths run roughly north → south (or outer end → Manhattan) so segments shared
// by several routes get a consistent direction for side-by-side drawing.

export const LINE_COLORS = {
  red: "#EE352E",
  green: "#00933C",
  purple: "#B933AD",
  blue: "#0039A6",
  orange: "#FF6319",
  lime: "#6CBE45",
  brown: "#996633",
  gray: "#A7A9AC",
  yellow: "#FCCC0A",
  shuttle: "#808183",
  sir: "#1D59B3",
};

// Left-to-right order when several colors share one segment.
export const COLOR_ORDER = [
  "blue",
  "orange",
  "lime",
  "brown",
  "gray",
  "yellow",
  "red",
  "green",
  "purple",
  "shuttle",
  "sir",
];

const range = (prefix, from, to, skip = []) => {
  const ids = [];
  for (let n = from; n <= to; n++) {
    if (skip.includes(n)) continue;
    ids.push(`${prefix}${String(n).padStart(2, "0")}`);
  }
  return ids;
};

// Shared trunks
const BWAY_7AV_96_TO_CHAMBERS = range("1", 20, 37); // 120…137
const LEX_125_TO_BKLYN_BRIDGE = range("6", 21, 40); // 621…640
const LEX_LOWER_TO_NEVINS = ["418", "419", "420", "423", "234", "235"];
const CPW = range("A", 14, 22, [13]).concat("A24"); // 135 St … 59 St
const SIXTH_AV = ["D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21"];
const SIXTH_AV_EXPRESS = ["D14", "D15", "D16", "D17", "D18", "D19", "D20", "D21", "D22"];
const QUEENS_BLVD_LOCAL = range("G", 8, 21, [17]); // Forest Hills … Queens Plaza
const BWAY_57_TO_PRINCE = range("R", 14, 22);
const ASTORIA = ["R01", "R03", "R04", "R05", "R06", "R08", "R09", "R11", "R13"];
const FOURTH_AV_TO_59 = ["R31", "R32", "R33", "R34", "R35", "R36", "R39", "R40", "R41"];
const BRIGHTON = range("D", 24, 43, [36]);
const CULVER = range("F", 20, 39, [28, 37]).concat("D42", "D43");
const JAMAICA_LINE = range("J", 12, 31, [18, 25, 26]).concat(range("M", 11, 23, [15, 17]));

export const ROUTES = [
  {
    id: "1",
    color: "red",
    paths: [range("1", 1, 42, [2, 5, 40, 41])],
  },
  {
    id: "2",
    color: "red",
    paths: [
      [
        "201", ...range("2", 4, 22), "224", "225", "226", "227",
        ...BWAY_7AV_96_TO_CHAMBERS,
        "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239",
        ...range("2", 41, 47),
      ],
    ],
  },
  {
    id: "3",
    color: "red",
    paths: [
      [
        "301", "302", "224", "225", "226", "227",
        ...BWAY_7AV_96_TO_CHAMBERS,
        "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239",
        ...range("2", 48, 57),
      ],
    ],
  },
  {
    id: "4",
    color: "green",
    paths: [
      [
        "401", "402", ...range("4", 5, 16),
        ...LEX_125_TO_BKLYN_BRIDGE, ...LEX_LOWER_TO_NEVINS,
        "236", "237", "238", "239", "248", "249", "250",
      ],
    ],
  },
  {
    id: "5",
    color: "green",
    paths: [
      [
        "501", "502", "503", "504", "505", ...range("2", 13, 22), "416",
        ...LEX_125_TO_BKLYN_BRIDGE, ...LEX_LOWER_TO_NEVINS,
        "236", "237", "238", "239", ...range("2", 41, 47),
      ],
    ],
  },
  {
    id: "6",
    color: "green",
    paths: [[...range("6", 1, 19, [5]), ...LEX_125_TO_BKLYN_BRIDGE]],
  },
  {
    id: "7",
    color: "purple",
    paths: [["701", "702", ...range("7", 5, 16), ...range("7", 18, 21), "723", "724", "725", "726"]],
  },
  {
    id: "A",
    color: "blue",
    paths: [
      [
        "A02", "A03", "A05", "A06", "A07", "A09", "A10", "A11", "A12",
        ...CPW, ...range("A", 25, 34, [26, 29]), "A36", "A38", ...range("A", 40, 55),
        "A57", "A59", "A60", "A61", "A63", "A64", "A65",
      ],
      ["A61", "H01", "H02", "H03", "H04", ...range("H", 6, 11)],
    ],
  },
  {
    id: "C",
    color: "blue",
    paths: [
      [
        "A09", "A10", "A11", "A12",
        ...CPW, ...range("A", 25, 34, [26, 29]), "A36", "A38", ...range("A", 40, 55),
      ],
    ],
  },
  {
    id: "E",
    color: "blue",
    paths: [
      [
        "G05", "G06", "G07", "F05", "F06", "F07",
        ...QUEENS_BLVD_LOCAL, "F09", "F11", "F12", "D14",
        ...range("A", 25, 34, [26, 29]), "E01",
      ],
    ],
  },
  {
    id: "B",
    color: "orange",
    paths: [
      [
        ...range("D", 3, 13), ...CPW, ...SIXTH_AV_EXPRESS,
        "R30", ...BRIGHTON.slice(0, BRIGHTON.indexOf("D40") + 1),
      ],
    ],
  },
  {
    id: "D",
    color: "orange",
    paths: [
      [
        "D01", ...range("D", 3, 13), ...CPW, ...SIXTH_AV_EXPRESS,
        "R31", "R32", "R33", "R34", "R35", "R36", ...range("B", 12, 23), "D43",
      ],
    ],
  },
  {
    id: "F",
    color: "orange",
    paths: [
      [
        ...range("F", 1, 7), ...QUEENS_BLVD_LOCAL, "F09", "F11", "F12",
        ...SIXTH_AV.slice(1), "F14", "F15", "F16", "F18", "A41", ...CULVER,
      ],
    ],
  },
  {
    id: "J",
    color: "brown",
    paths: [["G05", "G06", ...JAMAICA_LINE]],
  },
  {
    id: "Z",
    color: "brown",
    paths: [["G05", "G06", ...JAMAICA_LINE]],
  },
  {
    id: "M",
    color: "orange",
    paths: [
      [
        ...range("G", 8, 20, [17]), "B04", "B06", "B08", "B10",
        ...SIXTH_AV.slice(1), "M18", "M16", "M14", "M13", "M12", "M11",
        "M10", "M09", "M08", "M06", "M05", "M04", "M01",
      ],
    ],
  },
  {
    id: "G",
    color: "lime",
    paths: [["G22", ...range("G", 24, 36, [25, 27]), "A42", ...range("F", 20, 27)]],
  },
  {
    id: "L",
    color: "gray",
    paths: [range("L", 1, 29, [4, 7, 9, 18, 23])],
  },
  {
    id: "N",
    color: "yellow",
    paths: [
      [
        ...ASTORIA, ...BWAY_57_TO_PRINCE, "Q01", ...FOURTH_AV_TO_59,
        ...range("N", 2, 10), "D43",
      ],
    ],
  },
  {
    id: "Q",
    color: "yellow",
    paths: [["Q05", "Q04", "Q03", "B08", ...BWAY_57_TO_PRINCE, "Q01", "R30", ...BRIGHTON]],
  },
  {
    id: "R",
    color: "yellow",
    paths: [[...QUEENS_BLVD_LOCAL, "R11", "R13", ...range("R", 14, 45, [37, 38])]],
  },
  {
    id: "W",
    color: "yellow",
    paths: [[...ASTORIA, ...range("R", 14, 27)]],
  },
  { id: "S", label: "42 St Shuttle", color: "shuttle", paths: [["902", "901"]] },
  { id: "S", label: "Franklin Av Shuttle", color: "shuttle", paths: [["S01", "S03", "S04", "D26"]] },
  { id: "S", label: "Rockaway Park Shuttle", color: "shuttle", paths: [["H04", "H12", "H13", "H14", "H15"]] },
  {
    id: "SIR",
    label: "Staten Island Railway",
    color: "sir",
    paths: [[...range("S", 13, 31).reverse(), "S11", "S09"]],
  },
];

// Route bullet images live in /public, named by lowercase route id (a.png, sir.png…).
export const bulletSrc = (route) => `/${route.toLowerCase()}.png`;
