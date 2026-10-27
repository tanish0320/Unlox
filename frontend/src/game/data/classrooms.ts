import { ClassroomDef, TeacherDef } from "../types";

export const TEACHERS: Record<string, TeacherDef> = {
  maths: {
    id: "teacher-asha",
    name: "Ms. Asha",
    title: "Head of Mathematical Sciences",
    subject: "maths",
    subjectName: "Maths Tower",
    room: "maths",
    color: "#F59E0B",
    greeting: "Welcome to Maths Tower! Numbers are the secret language of the universe.",
    dialogueIntro: "What mathematical mystery would you like to explore today?",
    suggestedTopics: [
      "What is the Pythagorean theorem?",
      "How do fractions work?",
      "Understanding prime numbers",
      "What is probability?",
    ],
    position: { x: 9.5, y: 3.5 },
    direction: "down",
  },
  cs: {
    id: "teacher-byte",
    name: "Prof. Byte",
    title: "Lead Systems Architect",
    subject: "cs",
    subjectName: "Computer Science Lab",
    room: "cs",
    color: "#0284C7",
    greeting: "Hello, coder! Welcome to the Computer Science Lab.",
    dialogueIntro: "Let's turn logic and code into working software. What shall we build?",
    suggestedTopics: [
      "How does a Python loop work?",
      "What is a variable in coding?",
      "How does a web page load?",
      "What is an if statement?",
    ],
    position: { x: 9.5, y: 3.5 },
    direction: "down",
  },
  physics: {
    id: "teacher-newton",
    name: "Dr. Newton",
    title: "Astrophysics & Mechanics Chair",
    subject: "physics",
    subjectName: "Physics Observatory",
    room: "physics",
    color: "#8B5CF6",
    greeting: "Greetings! The laws of physics govern everything from falling apples to distant galaxies.",
    dialogueIntro: "Which physical force or phenomenon shall we investigate today?",
    suggestedTopics: [
      "How does gravity work on Earth?",
      "What are forces and motion?",
      "How do lenses bend light?",
      "How does electricity flow in a circuit?",
    ],
    position: { x: 9.5, y: 3.5 },
    direction: "down",
  },
  chemistry: {
    id: "teacher-mira",
    name: "Dr. Mira",
    title: "Molecular Chemistry Specialist",
    subject: "chemistry",
    subjectName: "Chemistry Lab",
    room: "chemistry",
    color: "#10B981",
    greeting: "Welcome to the Chemistry Lab! Be careful around the reagents.",
    dialogueIntro: "Every substance is made of vibrating atoms. What reaction will we study?",
    suggestedTopics: [
      "What are atoms and molecules?",
      "What is a chemical reaction?",
      "Understanding the Periodic Table",
      "Acids and bases: pH balance explained",
    ],
    position: { x: 9.5, y: 6.5 },
    direction: "up",
  },
  biology: {
    id: "teacher-flora",
    name: "Ms. Flora",
    title: "Botanist & Ecologist",
    subject: "biology",
    subjectName: "Biology Greenhouse",
    room: "biology",
    color: "#22C55E",
    greeting: "Welcome to the Greenhouse! Take a deep breath — the plants provide our oxygen.",
    dialogueIntro: "Life in all its forms is fascinating. What biological wonder shall we explore?",
    suggestedTopics: [
      "How do plants use photosynthesis?",
      "How does the human heart pump blood?",
      "What are cells and organelles?",
      "How do forest ecosystems balance food webs?",
    ],
    position: { x: 9.5, y: 6.5 },
    direction: "up",
  },
  social: {
    id: "teacher-atlas",
    name: "Mr. Atlas",
    title: "Curator of History & Geography",
    subject: "social",
    subjectName: "Social Sciences Museum",
    room: "social",
    color: "#D97706",
    greeting: "Welcome to the Museum of Human Civilization! History is the story of all of us.",
    dialogueIntro: "From ancient trade routes to modern constitutions, which tale shall we uncover?",
    suggestedTopics: [
      "How do trade routes work across history?",
      "What is democracy in simple terms?",
      "How maps and compasses work",
      "Understanding ancient river valley civilizations",
    ],
    position: { x: 9.5, y: 6.5 },
    direction: "up",
  },
};

export const CLASSROOMS: Record<string, ClassroomDef> = {
  // -------------------------------------------------------------
  // CENTRAL CORRIDOR / GRAND HALLWAY
  // -------------------------------------------------------------
  corridor: {
    id: "corridor",
    name: "Academy Grand Hallway",
    tagline: "The central corridor connecting all learning towers and scientific halls.",
    gridWidth: 26,
    gridHeight: 18,
    floorTheme: "tile_check",
    accentColor: "#234E3C",
    walls: [
      // Top ceiling
      { x: 0, y: 0, width: 26, height: 1 },
      // Top wall at y=1 with 3 doorway openings:
      // Door 1 (Maths) at x: 3, 4
      // Door 2 (CS) at x: 12, 13
      // Door 3 (Physics) at x: 21, 22
      { x: 0, y: 1, width: 3, height: 1 },
      { x: 5, y: 1, width: 7, height: 1 },
      { x: 14, y: 1, width: 7, height: 1 },
      { x: 23, y: 1, width: 3, height: 1 },

      // Left & right outer perimeter
      { x: 0, y: 0, width: 1, height: 18 },
      { x: 25, y: 0, width: 1, height: 18 },

      // Bottom base wall at y=17
      { x: 0, y: 17, width: 26, height: 1 },
      // Bottom wall at y=16 with 3 doorway openings:
      // Door 4 (Chemistry) at x: 3, 4
      // Door 5 (Biology) at x: 12, 13
      // Door 6 (Social) at x: 21, 22
      { x: 0, y: 16, width: 3, height: 1 },
      { x: 5, y: 16, width: 7, height: 1 },
      { x: 14, y: 16, width: 7, height: 1 },
      { x: 23, y: 16, width: 3, height: 1 },
    ],
    doors: [
      // Top row doors (North wings)
      {
        targetRoom: "maths",
        targetPosition: { x: 9.5, y: 11.0 },
        triggerArea: { x: 3, y: 0.6, width: 2, height: 1.0 },
        label: "Maths Tower [Ms. Asha]",
      },
      {
        targetRoom: "cs",
        targetPosition: { x: 9.5, y: 11.0 },
        triggerArea: { x: 12, y: 0.6, width: 2, height: 1.0 },
        label: "CS Lab [Prof. Byte]",
      },
      {
        targetRoom: "physics",
        targetPosition: { x: 9.5, y: 11.0 },
        triggerArea: { x: 21, y: 0.6, width: 2, height: 1.0 },
        label: "Physics Observatory [Dr. Newton]",
      },
      // Bottom row doors (South wings)
      {
        targetRoom: "chemistry",
        targetPosition: { x: 9.5, y: 2.2 },
        triggerArea: { x: 3, y: 15.8, width: 2, height: 1.0 },
        label: "Chemistry Lab [Dr. Mira]",
      },
      {
        targetRoom: "biology",
        targetPosition: { x: 9.5, y: 2.2 },
        triggerArea: { x: 12, y: 15.8, width: 2, height: 1.0 },
        label: "Biology Greenhouse [Ms. Flora]",
      },
      {
        targetRoom: "social",
        targetPosition: { x: 9.5, y: 2.2 },
        triggerArea: { x: 21, y: 15.8, width: 2, height: 1.0 },
        label: "Social Sciences [Mr. Atlas]",
      },
    ],
    furniture: [
      // Trophy cabinets & notice boards
      { id: "c-notice-1", x: 7, y: 2, width: 3, height: 1, type: "notice_board", label: "Academy Bulletin" },
      { id: "c-trophy-1", x: 16, y: 2, width: 3, height: 1, type: "trophy_case", label: "Achievements & Awards" },
      // Hallway potted plants
      { id: "c-plant-1", x: 1, y: 2, width: 1, height: 1, type: "plant" },
      { id: "c-plant-2", x: 24, y: 2, width: 1, height: 1, type: "plant" },
      { id: "c-plant-3", x: 1, y: 15, width: 1, height: 1, type: "plant" },
      { id: "c-plant-4", x: 24, y: 15, width: 1, height: 1, type: "plant" },
      // Benches for students in hallway (chairs are walkable)
      { id: "c-bench-1", x: 7, y: 9, width: 2, height: 1, type: "chair", label: "Study Bench" },
      { id: "c-bench-2", x: 17, y: 9, width: 2, height: 1, type: "chair", label: "Study Bench" },
    ],
  },

  // -------------------------------------------------------------
  // 1. MATHS TOWER
  // -------------------------------------------------------------
  maths: {
    id: "maths",
    name: "Maths Tower",
    tagline: "Geometry, algebra, patterns, and mathematical proofs.",
    subject: "maths",
    teacher: TEACHERS.maths,
    gridWidth: 20,
    gridHeight: 14,
    floorTheme: "wood",
    accentColor: "#D97706",
    walls: [
      { x: 0, y: 0, width: 20, height: 2 },
      { x: 0, y: 0, width: 1, height: 14 },
      { x: 19, y: 0, width: 1, height: 14 },
      // Bottom wall with doorway opening at x: 9, 10
      { x: 0, y: 13, width: 9, height: 1 },
      { x: 11, y: 13, width: 9, height: 1 },
    ],
    doors: [
      {
        targetRoom: "corridor",
        targetPosition: { x: 3.5, y: 2.4 },
        triggerArea: { x: 9, y: 12.6, width: 2, height: 1.2 },
        label: "Exit to Grand Hallway",
      },
    ],
    furniture: [
      { id: "m-board", x: 7, y: 1, width: 6, height: 1, type: "chalkboard", label: "a² + b² = c² | π ≈ 3.14159" },
      { id: "m-t-desk", x: 8.5, y: 4.5, width: 3, height: 1, type: "desk", label: "Ms. Asha's Desk" },
      { id: "m-book-1", x: 1, y: 2, width: 2, height: 2, type: "bookshelf", label: "Calculus & Geometry" },
      { id: "m-book-2", x: 17, y: 2, width: 2, height: 2, type: "bookshelf", label: "Number Theory" },
      // Student desks on left and right wings (clear central aisle!)
      { id: "m-s-desk-1", x: 3, y: 7, width: 2, height: 1, type: "desk" },
      { id: "m-s-desk-2", x: 3, y: 9, width: 2, height: 1, type: "desk" },
      { id: "m-s-desk-3", x: 15, y: 7, width: 2, height: 1, type: "desk" },
      { id: "m-s-desk-4", x: 15, y: 9, width: 2, height: 1, type: "desk" },
      { id: "m-plant", x: 18, y: 12, width: 1, height: 1, type: "plant" },
    ],
  },

  // -------------------------------------------------------------
  // 2. COMPUTER SCIENCE LAB
  // -------------------------------------------------------------
  cs: {
    id: "cs",
    name: "Computer Science Lab",
    tagline: "Algorithms, Python coding, data structures, and computer logic.",
    subject: "cs",
    teacher: TEACHERS.cs,
    gridWidth: 20,
    gridHeight: 14,
    floorTheme: "tile_check",
    accentColor: "#0284C7",
    walls: [
      { x: 0, y: 0, width: 20, height: 2 },
      { x: 0, y: 0, width: 1, height: 14 },
      { x: 19, y: 0, width: 1, height: 14 },
      // Bottom wall with doorway opening at x: 9, 10
      { x: 0, y: 13, width: 9, height: 1 },
      { x: 11, y: 13, width: 9, height: 1 },
    ],
    doors: [
      {
        targetRoom: "corridor",
        targetPosition: { x: 12.5, y: 2.4 },
        triggerArea: { x: 9, y: 12.6, width: 2, height: 1.2 },
        label: "Exit to Grand Hallway",
      },
    ],
    furniture: [
      { id: "cs-board", x: 7, y: 1, width: 6, height: 1, type: "chalkboard", label: "for i in range(n): print(i)" },
      { id: "cs-t-desk", x: 8.5, y: 4.5, width: 3, height: 1, type: "computer", label: "Prof. Byte's Terminal" },
      { id: "cs-server-1", x: 1, y: 2, width: 2, height: 2, type: "cabinet", label: "Compute Cluster 01" },
      { id: "cs-server-2", x: 17, y: 2, width: 2, height: 2, type: "cabinet", label: "Storage Node 02" },
      // Workstations on left and right wings
      { id: "cs-pc-1", x: 3, y: 7, width: 2, height: 1, type: "computer", label: "Workstation A" },
      { id: "cs-pc-2", x: 3, y: 9, width: 2, height: 1, type: "computer", label: "Workstation B" },
      { id: "cs-pc-3", x: 15, y: 7, width: 2, height: 1, type: "computer", label: "Workstation C" },
      { id: "cs-pc-4", x: 15, y: 9, width: 2, height: 1, type: "computer", label: "Workstation D" },
      { id: "cs-plant", x: 1, y: 12, width: 1, height: 1, type: "plant" },
    ],
  },

  // -------------------------------------------------------------
  // 3. PHYSICS OBSERVATORY
  // -------------------------------------------------------------
  physics: {
    id: "physics",
    name: "Physics Observatory",
    tagline: "Celestial mechanics, gravity, light optics, and electric forces.",
    subject: "physics",
    teacher: TEACHERS.physics,
    gridWidth: 20,
    gridHeight: 14,
    floorTheme: "stone",
    accentColor: "#8B5CF6",
    walls: [
      { x: 0, y: 0, width: 20, height: 2 },
      { x: 0, y: 0, width: 1, height: 14 },
      { x: 19, y: 0, width: 1, height: 14 },
      // Bottom wall with doorway opening at x: 9, 10
      { x: 0, y: 13, width: 9, height: 1 },
      { x: 11, y: 13, width: 9, height: 1 },
    ],
    doors: [
      {
        targetRoom: "corridor",
        targetPosition: { x: 21.5, y: 2.4 },
        triggerArea: { x: 9, y: 12.6, width: 2, height: 1.2 },
        label: "Exit to Grand Hallway",
      },
    ],
    furniture: [
      { id: "phy-board", x: 7, y: 1, width: 6, height: 1, type: "chalkboard", label: "F = ma | E = mc²" },
      { id: "phy-t-desk", x: 8.5, y: 4.5, width: 3, height: 1, type: "desk", label: "Dr. Newton's Lab Bench" },
      { id: "phy-tele-1", x: 2, y: 2, width: 2, height: 2, type: "telescope", label: "Starview Refractor" },
      { id: "phy-book-1", x: 17, y: 2, width: 2, height: 2, type: "bookshelf", label: "Astrophysics Volumes" },
      // Experiment benches
      { id: "phy-bench-1", x: 3, y: 7, width: 3, height: 1, type: "lab_bench", label: "Optics Prism Table" },
      { id: "phy-bench-2", x: 3, y: 9, width: 3, height: 1, type: "lab_bench", label: "Pendulum Stand" },
      { id: "phy-bench-3", x: 14, y: 7, width: 3, height: 1, type: "lab_bench", label: "Circuit Tester" },
      { id: "phy-bench-4", x: 14, y: 9, width: 3, height: 1, type: "lab_bench", label: "Magnetic Coil" },
      { id: "phy-plant", x: 18, y: 12, width: 1, height: 1, type: "plant" },
    ],
  },

  // -------------------------------------------------------------
  // 4. CHEMISTRY LAB
  // -------------------------------------------------------------
  chemistry: {
    id: "chemistry",
    name: "Chemistry Lab",
    tagline: "Elements, bonds, chemical reactions, and compound synthesis.",
    subject: "chemistry",
    teacher: TEACHERS.chemistry,
    gridWidth: 20,
    gridHeight: 14,
    floorTheme: "tile_check",
    accentColor: "#059669",
    walls: [
      { x: 0, y: 0, width: 20, height: 1 }, // top ceiling
      // top wall at y=1 with doorway opening at x: 9, 10
      { x: 0, y: 1, width: 9, height: 1 },
      { x: 11, y: 1, width: 9, height: 1 },
      { x: 0, y: 0, width: 1, height: 14 },
      { x: 19, y: 0, width: 1, height: 14 },
      { x: 0, y: 13, width: 20, height: 1 },
    ],
    doors: [
      {
        targetRoom: "corridor",
        targetPosition: { x: 3.5, y: 14.8 },
        triggerArea: { x: 9, y: 0.5, width: 2, height: 1.0 },
        label: "Exit to Grand Hallway",
      },
    ],
    furniture: [
      { id: "ch-board", x: 7, y: 12, width: 6, height: 1, type: "chalkboard", label: "2H₂ + O₂ -> 2H₂O + Energy" },
      { id: "ch-t-desk", x: 8.5, y: 5.5, width: 3, height: 1, type: "lab_bench", label: "Dr. Mira's Workstation" },
      { id: "ch-cabinet-1", x: 1, y: 2, width: 2, height: 2, type: "cabinet", label: "Reagents & Glassware" },
      { id: "ch-cabinet-2", x: 17, y: 2, width: 2, height: 2, type: "cabinet", label: "Chemical Reagents" },
      // Wet lab benches
      { id: "ch-bench-1", x: 3, y: 8, width: 3, height: 1, type: "lab_bench", label: "Distillation Station" },
      { id: "ch-bench-2", x: 3, y: 10, width: 3, height: 1, type: "lab_bench", label: "Titration Bench" },
      { id: "ch-bench-3", x: 14, y: 8, width: 3, height: 1, type: "lab_bench", label: "Centrifuge & Scales" },
      { id: "ch-bench-4", x: 14, y: 10, width: 3, height: 1, type: "lab_bench", label: "pH Analysis Station" },
      { id: "ch-plant", x: 1, y: 11, width: 1, height: 1, type: "plant" },
    ],
  },

  // -------------------------------------------------------------
  // 5. BIOLOGY GREENHOUSE
  // -------------------------------------------------------------
  biology: {
    id: "biology",
    name: "Biology Greenhouse",
    tagline: "Ecosystems, living cells, botany, and biological diversity.",
    subject: "biology",
    teacher: TEACHERS.biology,
    gridWidth: 20,
    gridHeight: 14,
    floorTheme: "wood",
    accentColor: "#16A34A",
    walls: [
      { x: 0, y: 0, width: 20, height: 1 },
      // top wall at y=1 with doorway opening at x: 9, 10
      { x: 0, y: 1, width: 9, height: 1 },
      { x: 11, y: 1, width: 9, height: 1 },
      { x: 0, y: 0, width: 1, height: 14 },
      { x: 19, y: 0, width: 1, height: 14 },
      { x: 0, y: 13, width: 20, height: 1 },
    ],
    doors: [
      {
        targetRoom: "corridor",
        targetPosition: { x: 12.5, y: 14.8 },
        triggerArea: { x: 9, y: 0.5, width: 2, height: 1.0 },
        label: "Exit to Grand Hallway",
      },
    ],
    furniture: [
      { id: "bio-board", x: 7, y: 12, width: 6, height: 1, type: "chalkboard", label: "6CO₂ + 6H₂O -> C₆H₁₂O₆ + 6O₂" },
      { id: "bio-t-desk", x: 8.5, y: 5.5, width: 3, height: 1, type: "desk", label: "Ms. Flora's Herbarium Bench" },
      // Plants & terrariums
      { id: "bio-plant-1", x: 1, y: 2, width: 2, height: 2, type: "plant", label: "Fern Sanctuary" },
      { id: "bio-plant-2", x: 17, y: 2, width: 2, height: 2, type: "plant", label: "Medicinal Herbs" },
      { id: "bio-bench-1", x: 3, y: 8, width: 3, height: 1, type: "lab_bench", label: "Microscope Station" },
      { id: "bio-bench-2", x: 3, y: 10, width: 3, height: 1, type: "lab_bench", label: "Seedling Nursery" },
      { id: "bio-bench-3", x: 14, y: 8, width: 3, height: 1, type: "lab_bench", label: "Specimen Table" },
      { id: "bio-bench-4", x: 14, y: 10, width: 3, height: 1, type: "lab_bench", label: "Cell Models" },
      { id: "bio-plant-3", x: 18, y: 11, width: 1, height: 1, type: "plant" },
      { id: "bio-plant-4", x: 1, y: 11, width: 1, height: 1, type: "plant" },
    ],
  },

  // -------------------------------------------------------------
  // 6. SOCIAL SCIENCES MUSEUM
  // -------------------------------------------------------------
  social: {
    id: "social",
    name: "Social Sciences Museum",
    tagline: "World history, geography, civilizations, civics, and cultures.",
    subject: "social",
    teacher: TEACHERS.social,
    gridWidth: 20,
    gridHeight: 14,
    floorTheme: "carpet",
    accentColor: "#B45309",
    walls: [
      { x: 0, y: 0, width: 20, height: 1 },
      // top wall at y=1 with doorway opening at x: 9, 10
      { x: 0, y: 1, width: 9, height: 1 },
      { x: 11, y: 1, width: 9, height: 1 },
      { x: 0, y: 0, width: 1, height: 14 },
      { x: 19, y: 0, width: 1, height: 14 },
      { x: 0, y: 13, width: 20, height: 1 },
    ],
    doors: [
      {
        targetRoom: "corridor",
        targetPosition: { x: 21.5, y: 14.8 },
        triggerArea: { x: 9, y: 0.5, width: 2, height: 1.0 },
        label: "Exit to Grand Hallway",
      },
    ],
    furniture: [
      { id: "soc-board", x: 7, y: 12, width: 6, height: 1, type: "chalkboard", label: "Global Trade & Human History" },
      { id: "soc-t-desk", x: 8.5, y: 5.5, width: 3, height: 1, type: "desk", label: "Mr. Atlas's Curator Desk" },
      { id: "soc-globe-1", x: 2, y: 2, width: 2, height: 2, type: "globe", label: "Ancient Terra Globe" },
      { id: "soc-book-1", x: 17, y: 2, width: 2, height: 2, type: "bookshelf", label: "Historical Archives" },
      // Exhibit display tables
      { id: "soc-table-1", x: 3, y: 8, width: 3, height: 1, type: "desk", label: "Silk Road Artifacts" },
      { id: "soc-table-2", x: 3, y: 10, width: 3, height: 1, type: "desk", label: "Maritime Navigation Display" },
      { id: "soc-table-3", x: 14, y: 8, width: 3, height: 1, type: "desk", label: "Civic Treaties & Scrolls" },
      { id: "soc-table-4", x: 14, y: 10, width: 3, height: 1, type: "desk", label: "Cartography Collection" },
      { id: "soc-plant", x: 1, y: 11, width: 1, height: 1, type: "plant" },
    ],
  },
};
