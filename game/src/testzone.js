// Engine test map. Only used when Wren's zone files are missing (?test=1 forces it).
GD.testZone = {
  id: 1, name: "Test Basin", depth: [0, 60], ambient: 0.35, water: ["#2a4a7a", "#0f1a36"],
  lore: { "1": "test_page" },
  map: [
    "##############################################",
    "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
    "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
    "#.....P...........s..........................#",
    "#...............................g............#",
    "#.....C.......g........###.............J.....#",
    "####.......########...#####...........g......#",
    "#####....##########...######.................#",
    "######..###########....#####....k....k....####",
    "#.......########........###....%%%%%%%%%%#####",
    "#..g....#####.......................%%%%######",
    "#.......###....1......A..........g.....%######",
    "#....U..###..#####..............^^^......#####",
    "##########...#####..............^^^...E..#####",
    "#.............###...............^^^......#####",
    "#..G.....F....###.......c...r...^^^......#####",
    "#######..#########..#################..#######",
    "#######XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX#####",
    "##############################################"
  ]
};
if (!GD.story) GD.story = {
  title: "GLIMMERDEEP", tagline: "Bring your own light. Mind who sees it.",
  intro: ["The storm took the flame.", "Someone has to go down and fetch it."],
  zones: { 1: { title: "Test Basin", sub: "0 m", enter: ["Engine test."] } },
  tips: { move: "WASD or arrows to swim.", lamp: "Q switches the lamp between LOW and BRIGHT.", dim: "Hold SHIFT to dim your lamp. Hunters can't see what doesn't shine.", glimmer: "Glimmers feed your lamp.", checkpoint: "Lantern-buoys remember you.", ping: "E sends a ping: see the rock, but everything hears it.", flare: "SPACE throws a flare. Hunters love a brighter light.", current: "The water has opinions here.", oilLow: "Your lamp is running low. Find glimmers.", hullLow: "One more knock and the Wick won't hold.", angler: "Something down there likes your light.", eel: "Dens in the wall. Pass them dim.", jelly: "Jellies glow, and they sting." },
  lore: { test_page: { title: "Test page", text: "If you can read this, lore works.", zone: 1 } },
  deaths: { dark: ["The dark was patient."], bite: ["Teeth."], sting: ["It burned."], spike: ["Sharp."] },
  whale: ["It wakes."], ending: ["The light comes home."], credits: ["Bramblelight Studio"]
};
GD.testFinale = {
  id: 5, name: "Test Trench", depth: [3000, 3200], ambient: 0.02, water: ["#0a1024", "#050814"], lore: {},
  map: (() => { const w = 50, rows = []; for (let y = 0; y < 30; y++) { let r = ''; for (let x = 0; x < w; x++) r += (x === 0 || x === w - 1 || y === 0 || y === 29) ? '#' : '.'; rows.push(r); }
    const set = (x, y, ch) => { rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1); };
    set(4, 4, 'I'); set(30, 15, 'W'); set(42, 22, '*'); set(8, 6, 'g'); set(12, 8, 'C'); return rows; })()
};
