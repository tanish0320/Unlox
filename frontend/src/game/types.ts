import { LessonLevel } from "../components/scenes/sceneTypes";

export type SubjectId = "maths" | "cs" | "physics" | "chemistry" | "biology" | "social";
export type RoomId = "corridor" | SubjectId;

export type Direction = "up" | "down" | "left" | "right";

export interface Position {
  x: number; // In grid tiles or sub-pixels
  y: number;
}

export interface TeacherDef {
  id: string;
  name: string;
  title: string;
  subject: SubjectId;
  subjectName: string;
  room: RoomId;
  color: string;
  greeting: string;
  dialogueIntro: string;
  suggestedTopics: string[];
  position: Position;
  direction: Direction;
}

export interface DoorDef {
  targetRoom: RoomId;
  targetPosition: Position;
  triggerArea: { x: number; y: number; width: number; height: number };
  label: string;
}

export interface FurnitureDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type:
    | "desk"
    | "chair"
    | "chalkboard"
    | "bookshelf"
    | "plant"
    | "computer"
    | "lab_bench"
    | "telescope"
    | "globe"
    | "cabinet"
    | "trophy_case"
    | "notice_board"
    | "window";
  label?: string;
  color?: string;
}

export interface ClassroomDef {
  id: RoomId;
  name: string;
  tagline: string;
  subject?: SubjectId;
  teacher?: TeacherDef;
  gridWidth: number;
  gridHeight: number;
  doors: DoorDef[];
  furniture: FurnitureDef[];
  walls: { x: number; y: number; width: number; height: number }[];
  floorTheme: "wood" | "tile_check" | "stone" | "carpet";
  accentColor: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  subject?: SubjectId;
  unlockedAt?: number;
}

export interface StudentProgress {
  version: number;
  studentName: string;
  avatarSeed: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalLessonsCompleted: number;
  subjectStats: Record<
    SubjectId,
    {
      lessonsCompleted: number;
      xpEarned: number;
      lastTopic?: string;
    }
  >;
  completedLessonIds: string[];
  unlockedBadges: string[];
}

export interface GameLaunchPayload {
  subject: SubjectId;
  teacherName: string;
  topic: string;
  level: LessonLevel;
  language?: string;
  duration?: number;
  suggestedDuration?: number;
}
