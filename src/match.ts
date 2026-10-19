export type Team = "home" | "away";
export type Point = { x: number; z: number };
export type Keyframe = { time: number; x: number; z: number };
export type Player = {
  id: string;
  number: number;
  name: string;
  role: string;
  team: Team;
  path: Keyframe[];
};
export type MatchEvent = {
  id: string;
  time: number;
  label: string;
  detail: string;
  type: "recovery" | "pass" | "receive" | "run" | "shot" | "goal";
  player: string;
  receiver?: string;
  end?: number;
};
export const DURATION = 30;
export const MATCH_START = 87 * 60 + 12;
export const teams = { home: "Northbank FC", away: "Eastford Athletic" };
const frames = (rows: number[][]): Keyframe[] =>
  rows.map(([time, x, z]) => ({ time, x, z }));
const path = (x: number, z: number, advance = 10): Keyframe[] =>
  frames([
    [0, x, z],
    [8, x + advance * 0.2, z - 1],
    [16, x + advance * 0.55, z + 1],
    [24, x + advance, z],
    [30, x + advance + 2, z],
  ]);
const player = (
  id: string,
  number: number,
  name: string,
  role: string,
  team: Team,
  trajectory: Keyframe[],
): Player => ({ id, number, name, role, team, path: trajectory });
export const players: Player[] = [
  player("h1", 1, "Owen Hart", "Goalkeeper", "home", path(-48, 0, 2)),
  player("h2", 2, "Finn Blake", "Right back", "home", path(-22, -26, 14)),
  player("h3", 3, "Noah Vale", "Left back", "home", path(-23, 26, 12)),
  player("h4", 4, "Leon Shaw", "Centre back", "home", path(-30, -10, 10)),
  player("h5", 5, "Arlo King", "Centre back", "home", path(-30, 10, 10)),
  player(
    "h6",
    6,
    "Theo Moreau",
    "Holding midfield",
    "home",
    frames([
      [0, -8, -2],
      [4, -5, 0],
      [8, 0, -3],
      [12, 10, -6],
      [18, 15, -6],
      [22, 20, -7],
      [30, 27, -7],
    ]),
  ),
  player(
    "h8",
    8,
    "Ilya Costa",
    "Central midfield",
    "home",
    frames([
      [0, -3, 11],
      [4, 1, 12],
      [6.5, 4, 12],
      [8, 5, 12],
      [12, 17, 9],
      [14, 22, 7],
      [18, 25, 6],
      [22, 28, 5],
      [30, 35, 7],
    ]),
  ),
  player("h10", 10, "Ezra Cole", "Attacking midfield", "home", path(6, 2, 23)),
  player(
    "h7",
    7,
    "Luca Reed",
    "Right wing",
    "home",
    frames([
      [0, 8, -24],
      [4, 12, -24],
      [8, 16, -23],
      [12, 22, -23],
      [16, 29, -22],
      [18, 34, -22],
      [20, 36, -16],
      [21.5, 37, -15],
      [24, 42, -13],
      [30, 46, -9],
    ]),
  ),
  player(
    "h9",
    9,
    "Mateo Vela",
    "Centre forward",
    "home",
    frames([
      [0, 18, 1],
      [4, 20, 0],
      [8, 23, 3],
      [12, 24, 4],
      [16, 28, 9],
      [18, 31, 9],
      [20, 35, 7],
      [22, 39, 3],
      [24, 42, 2],
      [25, 44, 2],
      [30, 47, -4],
    ]),
  ),
  player("h11", 11, "Jules Quinn", "Left wing", "home", path(12, 26, 28)),
  player(
    "a1",
    1,
    "Alex Mercer",
    "Goalkeeper",
    "away",
    frames([
      [0, 49, 0],
      [14, 49, -1],
      [20, 50, -0.5],
      [23, 50, 1],
      [24, 50.2, 1.5],
      [25.1, 51.6, 2.8],
      [30, 50, 0],
    ]),
  ),
  player(
    "a2",
    2,
    "Ben Rowan",
    "Left back",
    "away",
    frames([
      [0, 17, -25],
      [8, 22, -25],
      [14, 29, -24],
      [18, 35, -23],
      [20, 38, -22],
      [22, 40, -20],
      [24, 43, -17],
      [30, 46, -14],
    ]),
  ),
  player("a3", 3, "Sam Alder", "Right back", "away", path(22, 28, 23)),
  player(
    "a4",
    4,
    "Eli Brooks",
    "Centre back",
    "away",
    frames([
      [0, 27, -5],
      [8, 28, -3],
      [12, 30, -2],
      [16, 32, -6],
      [18, 35, -8],
      [20, 36, -12],
      [22, 39, -10],
      [24, 41, -8],
      [26, 44, -4],
      [30, 46, -4],
    ]),
  ),
  player(
    "a5",
    5,
    "Oscar Lane",
    "Centre back",
    "away",
    frames([
      [0, 28, 11],
      [8, 29, 10],
      [12, 32, 10],
      [16, 34, 15],
      [18, 36, 17],
      [20, 37, 17],
      [22, 39, 15],
      [24, 43, 12],
      [26, 46, 9],
      [30, 47, 6],
    ]),
  ),
  player("a6", 6, "Max Ellis", "Holding midfield", "away", path(10, 1, 22)),
  player("a8", 8, "Nico Ford", "Central midfield", "away", path(2, 15, 23)),
  player(
    "a10",
    10,
    "Emil Stone",
    "Attacking midfield",
    "away",
    path(-1, -8, 21),
  ),
  player("a7", 7, "Rory Bell", "Left wing", "away", path(-10, -26, 18)),
  player("a9", 9, "Toby Wells", "Centre forward", "away", path(-17, 0, 16)),
  player("a11", 11, "Kit Hayes", "Right wing", "away", path(-11, 24, 18)),
];
export const events: MatchEvent[] = [
  {
    id: "recovery",
    time: 0,
    label: "The recovery",
    detail: "Moreau wins possession and looks forward.",
    type: "recovery",
    player: "h6",
  },
  {
    id: "first-pass",
    time: 4,
    end: 6.5,
    label: "Find the pivot",
    detail: "Moreau plays into Costa in midfield.",
    type: "pass",
    player: "h6",
    receiver: "h8",
  },
  {
    id: "first-receive",
    time: 6.5,
    label: "Turn forward",
    detail: "Costa receives and carries into space.",
    type: "receive",
    player: "h8",
  },
  {
    id: "switch",
    time: 11.5,
    end: 14.5,
    label: "Break the line",
    detail: "Costa switches play to Reed on the right.",
    type: "pass",
    player: "h8",
    receiver: "h7",
  },
  {
    id: "wide-receive",
    time: 14.5,
    label: "Into the wide channel",
    detail: "Reed receives with room to attack.",
    type: "receive",
    player: "h7",
  },
  {
    id: "run",
    time: 18,
    label: "Watch the runner",
    detail: "Vela curves his run as the defence shifts wide.",
    type: "run",
    player: "h9",
  },
  {
    id: "assist",
    time: 21.5,
    end: 23,
    label: "The decisive pass",
    detail: "Reed cuts the ball back into Vela’s path.",
    type: "pass",
    player: "h7",
    receiver: "h9",
  },
  {
    id: "reception",
    time: 23,
    label: "Space to finish",
    detail: "Vela receives inside the penalty area.",
    type: "receive",
    player: "h9",
  },
  {
    id: "shot",
    time: 24,
    end: 25.1,
    label: "The finish",
    detail: "Vela shoots across the goalkeeper.",
    type: "shot",
    player: "h9",
  },
  {
    id: "goal",
    time: 25.1,
    label: "Northbank take the lead",
    detail: "The finish makes it 2–1.",
    type: "goal",
    player: "h9",
  },
];
export const keyMoments = ["recovery", "switch", "assist", "goal"].map((id) =>
  events.find((e) => e.id === id)!,
);
