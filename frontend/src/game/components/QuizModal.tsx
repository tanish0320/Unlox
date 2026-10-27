import React, { useState, useMemo } from "react";
import { SubjectId } from "../types";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizModalProps {
  topic: string;
  subject: SubjectId;
  questions?: { question: string; answer: string }[];
  onComplete: (xpGained: number) => void;
  onSkip: () => void;
}

const FALLBACK_QUIZZES: Record<SubjectId, QuizQuestion[]> = {
  cs: [
    {
      question: "What is the initial loop counter value in 'for i in range(3):'?",
      options: ["1", "0", "3", "-1"],
      correctIndex: 1,
      explanation: "Python's range(3) starts at index 0 and generates 0, 1, and 2.",
    },
    {
      question: "Why do programmers use loops?",
      options: [
        "To repeat instructions automatically",
        "To make the computer run slower",
        "To delete unused files",
        "To shut down the operating system",
      ],
      correctIndex: 0,
      explanation: "Loops prevent manual repetition and automate iterative execution.",
    },
  ],
  maths: [
    {
      question: "In the Pythagorean theorem (a² + b² = c²), what is 'c'?",
      options: ["The right angle", "The shortest leg", "The hypotenuse", "The perimeter"],
      correctIndex: 2,
      explanation: "c is the hypotenuse, the longest side opposite the right angle.",
    },
  ],
  physics: [
    {
      question: "What does Newton's Second Law (F = ma) state?",
      options: [
        "Force equals mass times acceleration",
        "Force equals mass divided by velocity",
        "Energy cannot be created or destroyed",
        "Speed equals distance times time",
      ],
      correctIndex: 0,
      explanation: "Net force acting on an object is equal to its mass times its acceleration.",
    },
  ],
  chemistry: [
    {
      question: "What is an atom primarily composed of?",
      options: [
        "Protons, neutrons, and electrons",
        "Liquids and gases",
        "Light waves only",
        "Pure minerals",
      ],
      correctIndex: 0,
      explanation: "Atoms consist of a nucleus (protons and neutrons) orbited by electrons.",
    },
  ],
  biology: [
    {
      question: "What essential gas do plants produce as a byproduct of photosynthesis?",
      options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Methane"],
      correctIndex: 1,
      explanation: "Plants absorb carbon dioxide and release oxygen during photosynthesis.",
    },
  ],
  social: [
    {
      question: "What ancient network of trade routes connected the East and West?",
      options: ["The Silk Road", "The Atlantic Highway", "The Spice Flight", "The Polar Passage"],
      correctIndex: 0,
      explanation: "The historic Silk Road facilitated trade between Asia, Europe, and Africa.",
    },
  ],
};

export const QuizModal: React.FC<QuizModalProps> = ({
  topic,
  subject,
  questions,
  onComplete,
  onSkip,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  // Generate and memoize quiz list
  const activeQuizList: QuizQuestion[] = useMemo(() => {
    if (questions && questions.length > 0) {
      return questions.slice(0, 2).map((q) => {
        const rawOptions = [
          q.answer,
          "An alternative unrelated outcome",
          "A common misconception",
          "None of the above",
        ];
        const shuffled = [...rawOptions].sort(() => 0.5 - Math.random());
        const correctIndex = shuffled.indexOf(q.answer);
        return {
          question: q.question,
          options: shuffled,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          explanation: `Correct: ${q.answer}`,
        };
      });
    }
    return FALLBACK_QUIZZES[subject] || FALLBACK_QUIZZES.cs;
  }, [questions, subject]);

  const currentQ = activeQuizList[currentIdx];

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correctIndex) {
      setEarnedXP((prev) => prev + 25);
    }
  };

  const handleNext = () => {
    if (currentIdx < activeQuizList.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      onComplete(earnedXP);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(11, 16, 32, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "2px solid #E2DCD2",
          overflow: "hidden",
          fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
        }}
      >
        <div
          style={{
            backgroundColor: "#234E3C",
            color: "#FFFFFF",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A7F3D0" }}>
              Quick Knowledge Check
            </div>
            <h3 style={{ margin: "2px 0 0 0", fontSize: 18, fontWeight: 700 }}>
              {topic}
            </h3>
          </div>
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>
            QUESTION {currentIdx + 1} OF {activeQuizList.length} (+25 XP)
          </div>

          <p style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", lineHeight: 1.5, margin: "0 0 20px 0" }}>
            {currentQ.question}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === currentQ.correctIndex;

              let btnBorder = "1px solid #E2E8F0";
              let btnBg = "#F8FAFC";
              let btnColor = "#1E293B";

              if (isAnswered) {
                if (isCorrect) {
                  btnBorder = "2px solid #10B981";
                  btnBg = "#ECFDF5";
                  btnColor = "#065F46";
                } else if (isSelected && !isCorrect) {
                  btnBorder = "2px solid #EF4444";
                  btnBg = "#FEF2F2";
                  btnColor = "#991B1B";
                }
              }

              return (
                <button
                  key={i}
                  disabled={isAnswered}
                  onClick={() => handleSelect(i)}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: btnBorder,
                    backgroundColor: btnBg,
                    color: btnColor,
                    fontSize: 14,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: isAnswered ? "default" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                backgroundColor:
                  selectedOption === currentQ.correctIndex ? "#ECFDF5" : "#FEF2F2",
                color:
                  selectedOption === currentQ.correctIndex ? "#065F46" : "#991B1B",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {selectedOption === currentQ.correctIndex ? "🎉 Correct! +25 XP" : "💡 Not quite!"}{" "}
              {currentQ.explanation}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={onSkip}
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Skip Challenge
            </button>

            <button
              disabled={!isAnswered}
              onClick={handleNext}
              style={{
                padding: "10px 22px",
                borderRadius: 8,
                border: "none",
                backgroundColor: isAnswered ? "#234E3C" : "#94A3B8",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: isAnswered ? "pointer" : "not-allowed",
              }}
            >
              {currentIdx < activeQuizList.length - 1 ? "Next Question" : `Claim ${earnedXP} XP & Finish`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
