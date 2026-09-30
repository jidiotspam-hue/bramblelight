// GLIMMERDEEP: all in-game text. Owner: Wren (design & words).
// Plain script, no modules. Tips are sized for a small box at 480x270; keep them short.
GD.story = {
  title: "GLIMMERDEEP",
  tagline: "Bring your own light. Mind who sees it.",

  intro: [
    "Merrow Light has burned every night since 1887.",
    "Last night the storm broke the lantern room, and the flame went over the rail.",
    "It didn't go out. You watched it sink, still burning, until the dark closed over it.",
    "Mum's arm is in a sling. The boats won't sail without the light.",
    "In the boathouse, under a tarp, is Gran's old diving bell. She called it the Wick.",
    "It still floats. It still sinks, if you ask it to.",
    "Go and bring the flame home."
  ],

  zones: {
    1: { title: "The Harbor Shelf", sub: "0 m",
         enter: ["The old harbor. Sunlight still reaches this far."] },
    2: { title: "Kelp Cathedral", sub: "40 m",
         enter: ["The kelp grows tall enough to hold the dark up.", "Gran called it the quietest church in the world."] },
    3: { title: "The Twilight Drop", sub: "200 m",
         enter: ["This is where the sun gives up.", "Something below is fishing with a light of its own."] },
    4: { title: "Drowned Lighthouse", sub: "1000 m",
         enter: ["The first Merrow Light. The sea took it in 1887.", "Someone has been here before you. The door is propped open."] },
    5: { title: "The Hadal Trench", sub: "3000 m",
         enter: ["No sunlight has ever been here.", "Only your lamp, and something very large, breathing."] }
  },

  tips: {
    move: "Arrows or WASD to swim. The Wick drifts. Let her.",
    lamp: "Q turns the lamp up or down. Bright burns oil fast.",
    dim: "Hold Shift to dim. Less light, less oil, fewer eyes.",
    glimmer: "Glimmers are living light. Swim through them for oil.",
    checkpoint: "A lantern buoy. Touch it to save and mend the hull.",
    ping: "Press E to ping. The walls answer. So might something else.",
    flare: "Space throws a flare. Hunters chase the brightest light.",
    current: "Currents shove hard. Cross them, don't fight them.",
    oilLow: "The lamp is guttering. Find glimmers, or go dim.",
    hullLow: "The hull is groaning. Find a buoy or a patch.",
    angler: "An angler. It hunts by light. Go dim and let it pass.",
    eel: "Eels sleep in the walls. Pass them dim; they won't wake.",
    jelly: "Jellies sting, but they glow. Dim, and borrow their light."
  },

  lore: {
    // ---- Zone 1: The Harbor Shelf ----
    storm_log: { zone: 1, title: "Keeper's Log, torn page",
      text: "Oct 3. Wind south-west, force ten and rising. The lantern-room glass went at 11:40. I got the shutters up on two sides before the third came in on me. The flame went over the rail. Not out. Over. I watched it fall the whole way, like a coin down a well, and it was still burning when the water took it. My arm is no good. Sprat was on the stairs in their nightclothes, watching. I said go back to bed. They didn't. They were looking at the boathouse. God help me, so was I. — I.C." },
    lamp_ledger: { zone: 1, title: "Harbormaster's Ledger",
      text: "LOST OVER THE SIDE, MERROW HARBOR. 1 riding lamp, the Plover, 1911. 2 candle lanterns, the Hask boys, larking, 1923. 1 brass storm lamp, the Good Intent, 1940. 1 paraffin lamp, Mrs Oddie, dropped from the quay, 1962. 1 torch, electric, a visitor, 1978. And so on down the page, in six different hands. In the margin someone has written, in pencil: Not one has ever washed up. Glass floats. Brass floats, near enough. So where do they go?" },
    maud_practice: { zone: 1, title: "A bottle in the wreck",
      text: "Practice dive, the fourteenth. Through the Constance from bow to stern with the lamp turned low. The Wick doesn't need air, only nerve, and I'm building that slowly. Iris asked why I keep going down. I said I'm looking for a light we lost. She said, the light is up there, Mam, and pointed at the tower. She's six and right about most things. I've decided to leave a bottle wherever I'm frightened. It helps to write it down. — M.C." },

    // ---- Zone 2: Kelp Cathedral ----
    hester_rhyme: { zone: 2, title: "A skipping rhyme",
      text: "Down went Hester in the black, / net came up with a star on its back. / Didn't burn and didn't drown, / carried it home to Merrow town. / Build it high and keep it bright; / what the sea lends, the sea may want back one night. — Every child in Merrow skips to it. Only the Carrows know it's a family story: Hester was the first of us, lost in a squall, and something rose under her boat and left a light in her net. She built the Old Light to keep it." },
    maud_kelp: { zone: 2, title: "A bottle in the kelp",
      text: "I didn't expect it to be beautiful. The kelp goes up and up like pillars, and the light comes down through it in long gold ropes, and there is no sound at all but the Wick ticking as she cools. The jellies are the trouble. Pretty, and they sting like nettles. But they carry their own light, so I turned my lamp right down and slipped between them on theirs, like coming in late to church and sitting at the back. — M.C." },
    maud_cave: { zone: 2, title: "A bottle in the dark cave",
      text: "Found a cave that is darker than it has any right to be, this close to the sun. I rapped on the hull with the wrench and listened, the way Da taught me to listen for the rocks in fog. The walls sang back. You can see with your ears down here, if you're patient and you don't mind what else is listening. Frightened, so: a bottle. Iris would like this cave. Iris would like it from a very long way away. — M.C." },

    // ---- Zone 3: The Twilight Drop ----
    admiralty_note: { zone: 3, title: "Survey chart, pencilled note",
      text: "MERROW DEEP. Sounding abandoned: line parted at 900 fathoms, no bottom found. Remarks of the crew, entered at their insistence: on the second night, lights were seen beneath the ship, very deep, moving slow and together, as of a town passing underneath. Lamps were lowered on a line to investigate. The lamps did not come back up. The line did. It had not been cut or bitten. It had been untied." },
    maud_anglers: { zone: 3, title: "A bottle on a ledge",
      text: "They have lamps too. That's the part nobody tells you. A little light on a stalk, swinging, and everything lonely down here swims towards it. I swam towards it. I very nearly didn't swim away. Threw a flare and hid behind a rock with my lamp down to nothing, and watched that great sad ugly thing chase my flare into the dark, and I laughed until I cried. Iris, if you ever read this, your mother is a coward, and it saved her life. — M.C." },
    maud_turnback: { zone: 3, title: "A bottle at the bottom",
      text: "Nearly turned back here. Sat on a ledge with the lamp low and thought about Iris's cold feet in bed, how she tucks them against my shins. What am I doing down here? Looking for a light that fell before my grandfather was grown. Because Da always said it was still burning somewhere. Because the rhyme says the sea may want it back, and I want to know whether it was asked for or taken. Going on. — M.C." },

    // ---- Zone 4: Drowned Lighthouse ----
    josiah_log_1: { zone: 4, title: "Keeper's Log, Old Merrow Light, 1886",
      text: "Third night running the great light has come in under the rock. It rises past the reef like a lit town, turns once beneath the lamp, and sinks again. Mrs Pruett in the village says it is the Devil fishing. I say the Devil would not be so polite. It never goes near the boats. It only looks up at the lamp, the way a dog looks at the door when its master is out. I have not told the Board. — J. Carrow" },
    edwin_slate: { zone: 4, title: "A child's slate",
      text: "Chalk, half washed away. A sum, done wrong and corrected. A drawing of the tower with the beam coming out of it in straight lines, and under the sea a long shape covered all over in dots. Then, in careful capitals: THE BIG FISH CAME AGAIN. PA SAYS WE MUST NOT WAVE AT IT. I WAVED. IT WAS SO BIG AND IT HAS NOBODY. — Edwin Carrow, aged 7. That's Gran's grandfather." },
    josiah_log_2: { zone: 4, title: "Keeper's Log, March 1887",
      text: "The rock is moving. Hairline cracks in the cellar, salt in the cistern, and the stair has a tilt to it you can feel in your knees. The engineers from Truro say the headland is sound. The headland says otherwise. I have sent Mary and the children up to the cottage on the hill, and I sleep in the lamp room with my boots on. If the tower goes, I shall carry the flame. That is the whole of the job. A keeper carries the flame. — J. Carrow" },
    maud_oldlight: { zone: 4, title: "A bottle in the lamp room",
      text: "The lamp room is empty. Not smashed. Empty, as if the flame were lifted out by a careful hand. I know the rest from Da. The tower went at two in the morning, quiet as a sigh. Josiah lit a wick off the flame, cupped it in his hat, and ran the causeway with the stones going out from under him. That wick lit the Merrow Light we keep now. I named my bell for it. But the old flame fell with the tower, and something caught it. — M.C." },

    // ---- Zone 5: The Hadal Trench ----
    maud_trench: { zone: 5, title: "A bottle in the trench",
      text: "No light at all now but mine. I have stopped being frightened. It's too big to be frightened of, like being afraid of the sky. I keep thinking of the ledger at the harbor. Every lamp that ever went over the side, and not one came back. And the survey men's lamps, untied. I think I know where they went. I think something down here collects them, one by one, the way Iris collects shells, and keeps them in the dark. — M.C." },
    maud_letter: { zone: 5, title: "A letter, never sent",
      text: "Iris. When I came home you asked what I'd found, and I said fish, and you laughed, and I let you. I'm sorry. Here is the truth, in case I'm too much of a coward to say it at the table. We didn't make our light. We were lent it. Hester's star came from down here, and every light we've dropped since, somebody has caught and kept safe from the dark. Nobody ever came down to say thank you. So I did. — Mam" },
    maud_whale: { zone: 5, title: "The last bottle",
      text: "I found it. Or it let me. It isn't a monster. It's a keeper, like us, only for the other side of the water. It is full of lights: every lamp in the ledger, burning along its sides like a town at night. It held the Old Light's flame out to me in its mouth. And I looked at it, the only warm thing for three miles in any direction, and I couldn't take it. If you're reading this, you're a Carrow, and something fell. Ask. Don't take. It will give. And tell it I'm sorry I was so long. — M.C." }
  },

  deaths: {
    dark: [
      "The lamp sighed out. The sea closed its hand, then opened it again.",
      "No oil, no light. Somewhere above, a buoy is still burning for you.",
      "The dark didn't want you. It only wanted the light."
    ],
    bite: [
      "It wanted the light. It took the hull instead.",
      "Teeth, and then the long drift back.",
      "Hungry things are honest things. Try again, and dimmer."
    ],
    sting: [
      "A bright little ache. The jelly drifts on, unbothered.",
      "Pretty things sting. Gran wrote that down somewhere.",
      "The jelly didn't mean it. Jellies don't mean anything."
    ],
    spike: [
      "The urchin didn't move. It never does.",
      "Spines, patient as stones.",
      "Mind the floor. It has opinions."
    ]
  },

  whale: [
    "The dark ahead isn't empty. It's breathing.",
    "Lights wake along its side, one by one. A riding lamp. Two candle lanterns. An electric torch.",
    "Every light the sea ever took. It hasn't eaten them. It has been keeping them.",
    "An eye opens, big as the Wick, and looks at your little lamp for a long time.",
    "It knows the bell. It has seen the Wick before.",
    "You tell it Gran is sorry she was so long.",
    "Something warm moves in its throat. It opens its mouth slowly, the way you'd open a hand.",
    "Two flames. The old one, from the tower that fell. And Merrow's, still burning from last night.",
    "You don't take. You ask.",
    "It gives you Merrow's flame, and keeps the old one close."
  ],

  ending: [
    "Up through the trench. Up past the Old Light, where the door is still propped open.",
    "The anglers watch you pass and do not follow. Even they know whose light this is.",
    "Up through the kelp, into blue, into green, into morning.",
    "Mum is on the harbor steps. She doesn't say anything. She doesn't have to.",
    "Later she asks what you found down there. You nearly say fish.",
    "You tell her everything.",
    "That night Merrow Light burns again, and the boats come home by it.",
    "And once a night, when the lamp turns, a Carrow lowers a lantern over the rail on a long chain, down into the dark.",
    "Every lighthouse points out to sea. Ours points down, too.",
    "Far below, something enormous turns towards it, and is not alone."
  ],

  credits: [
    "Bramblelight Studio",
    "Opal — direction & code",
    "Wren — design & words",
    "Moss — pixel art",
    "Juno — marketing",
    "Bug — office cat, QA"
  ]
};
