import { useState, useEffect, useCallback } from "react";
import { StudentProgress, SubjectId } from "../types";
import { ProgressStorage } from "./storage";
import { BADGES } from "../data/badges";

export function useGameProgress() {
  const [progress, setProgress] = useState<StudentProgress>(() => ProgressStorage.load());
  const [recentNotification, setRecentNotification] = useState<{
    title: string;
    description: string;
    icon: string;
  } | null>(null);

  // Sync to local storage on change
  useEffect(() => {
    ProgressStorage.save(progress);
  }, [progress]);

  // Calculate next level threshold: level * 120 XP
  const calculateNextLevelXP = (currentLevel: number): number => {
    return currentLevel * 120;
  };

  /**
   * Award lesson completion XP, increment counts, and check for new badges.
   * Guarantees duplicate completion prevention.
   */
  const awardLessonCompletion = useCallback(
    (subject: SubjectId, lessonId: string, topic: string) => {
      setProgress((prev) => {
        // Prevent duplicate rewards for the exact same lessonId
        if (prev.completedLessonIds.includes(lessonId)) {
          return prev;
        }

        const xpGained = 100;
        let newXP = prev.currentXP + xpGained;
        let newLevel = prev.level;
        let nextXP = prev.nextLevelXP;

        // Level up check
        while (newXP >= nextXP) {
          newXP -= nextXP;
          newLevel += 1;
          nextXP = calculateNextLevelXP(newLevel);
        }

        const newTotalLessons = prev.totalLessonsCompleted + 1;
        const prevSubject = prev.subjectStats[subject] || { lessonsCompleted: 0, xpEarned: 0 };
        const newSubjectStats = {
          ...prev.subjectStats,
          [subject]: {
            lessonsCompleted: prevSubject.lessonsCompleted + 1,
            xpEarned: prevSubject.xpEarned + xpGained,
            lastTopic: topic,
          },
        };

        const newCompletedIds = [...prev.completedLessonIds, lessonId];
        const newBadges = [...prev.unlockedBadges];

        // 1. First lesson badge
        if (!newBadges.includes("first_lesson")) {
          newBadges.push("first_lesson");
          setRecentNotification({
            title: "Badge Unlocked: First Discovery!",
            description: "Completed your very first lesson in Blu Academy.",
            icon: "🌟",
          });
        }

        // 2. Subject specific badges
        const subjectBadgeMap: Record<SubjectId, string> = {
          maths: "maths_explorer",
          cs: "code_apprentice",
          physics: "newtons_apple",
          chemistry: "alchemist",
          biology: "bio_pioneer",
          social: "time_traveler",
        };

        const subjectBadge = subjectBadgeMap[subject];
        if (subjectBadge && !newBadges.includes(subjectBadge)) {
          newBadges.push(subjectBadge);
          const badgeDef = BADGES.find((b) => b.id === subjectBadge);
          if (badgeDef) {
            setRecentNotification({
              title: `Badge Unlocked: ${badgeDef.title}!`,
              description: badgeDef.description,
              icon: badgeDef.icon,
            });
          }
        }

        // 3. 5 lessons badge
        if (newTotalLessons >= 5 && !newBadges.includes("dedicated_scholar")) {
          newBadges.push("dedicated_scholar");
          setRecentNotification({
            title: "Badge Unlocked: Dedicated Scholar!",
            description: "Completed 5 lessons across Blu Academy.",
            icon: "🏆",
          });
        }

        // 4. Polymath badge (all 6 subjects completed at least once)
        const allSubjectsCompleted = Object.values(newSubjectStats).every(
          (stats) => stats.lessonsCompleted > 0
        );
        if (allSubjectsCompleted && !newBadges.includes("polymath")) {
          newBadges.push("polymath");
          setRecentNotification({
            title: "Badge Unlocked: Grand Polymath!",
            description: "Mastered lessons across all 6 learning disciplines!",
            icon: "👑",
          });
        }

        return {
          ...prev,
          level: newLevel,
          currentXP: newXP,
          nextLevelXP: nextXP,
          totalLessonsCompleted: newTotalLessons,
          subjectStats: newSubjectStats,
          completedLessonIds: newCompletedIds,
          unlockedBadges: newBadges,
        };
      });
    },
    []
  );

  const awardQuizXP = useCallback((xp: number) => {
    setProgress((prev) => {
      let newXP = prev.currentXP + xp;
      let newLevel = prev.level;
      let nextXP = prev.nextLevelXP;

      while (newXP >= nextXP) {
        newXP -= nextXP;
        newLevel += 1;
        nextXP = calculateNextLevelXP(newLevel);
      }

      return {
        ...prev,
        level: newLevel,
        currentXP: newXP,
        nextLevelXP: nextXP,
      };
    });
  }, []);

  const resetAllProgress = useCallback(() => {
    const fresh = ProgressStorage.reset();
    setProgress(fresh);
  }, []);

  return {
    progress,
    awardLessonCompletion,
    awardQuizXP,
    resetAllProgress,
    recentNotification,
    clearNotification: () => setRecentNotification(null),
  };
}
