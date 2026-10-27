import { StudentProgress, SubjectId } from "../types";

export const STORAGE_KEY = "BLU_ACADEMY_PROGRESS_v1";

export const DEFAULT_PROGRESS: StudentProgress = {
  version: 1,
  studentName: "Academy Explorer",
  avatarSeed: 1,
  level: 1,
  currentXP: 0,
  nextLevelXP: 100,
  totalLessonsCompleted: 0,
  subjectStats: {
    maths: { lessonsCompleted: 0, xpEarned: 0 },
    cs: { lessonsCompleted: 0, xpEarned: 0 },
    physics: { lessonsCompleted: 0, xpEarned: 0 },
    chemistry: { lessonsCompleted: 0, xpEarned: 0 },
    biology: { lessonsCompleted: 0, xpEarned: 0 },
    social: { lessonsCompleted: 0, xpEarned: 0 },
  },
  completedLessonIds: [],
  unlockedBadges: [],
};

export class ProgressStorage {
  static load(): StudentProgress {
    if (typeof window === "undefined" || !window.localStorage) {
      return { ...DEFAULT_PROGRESS };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROGRESS };

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
        // Corrupted or incompatible version, fallback safely
        return { ...DEFAULT_PROGRESS };
      }

      // Merge safely with defaults to ensure all fields and subjects exist
      return {
        ...DEFAULT_PROGRESS,
        ...parsed,
        subjectStats: {
          ...DEFAULT_PROGRESS.subjectStats,
          ...(parsed.subjectStats || {}),
        },
        completedLessonIds: Array.isArray(parsed.completedLessonIds)
          ? parsed.completedLessonIds
          : [],
        unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
      };
    } catch {
      // In case of JSON parse failure or quota error
      return { ...DEFAULT_PROGRESS };
    }
  }

  static save(progress: StudentProgress): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch {
      return false;
    }
  }

  static reset(): StudentProgress {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return { ...DEFAULT_PROGRESS };
  }
}

export const loadProgress = (): StudentProgress => ProgressStorage.load();
export const saveProgress = (progress: StudentProgress): boolean => ProgressStorage.save(progress);
export const resetProgress = (): StudentProgress => ProgressStorage.reset();

