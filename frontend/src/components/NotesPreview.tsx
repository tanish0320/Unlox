import React from "react";
import { NotesPreviewProps } from "./scenes/sceneTypes";
import "../styles/fonts.css";

export const NotesPreview: React.FC<NotesPreviewProps> = ({
  notes,
  className = "",
}) => {
  if (!notes) {
    return (
      <div className={`blu-notes-container ${className}`} data-testid="blu-notes-empty">
        <p style={{ color: "var(--blu-muted)", textAlign: "center" }}>
          No study notes available for this lesson.
        </p>
      </div>
    );
  }

  const {
    title,
    topic,
    language = "en",
    level,
    summary,
    learning_objectives = [],
    key_concepts = [],
    step_by_step_explanation = [],
    examples = [],
    key_takeaways = [],
    revision_questions = [],
  } = notes;

  const scriptClass = `blu-script-${language.toLowerCase()}`;

  return (
    <div
      className={`blu-notes-container ${scriptClass} ${className}`}
      data-testid="blu-notes-preview"
      data-language={language}
    >
      {/* Header */}
      <div className="blu-notes-header">
        <div className="blu-notes-meta">
          {level && <span className="blu-scene-badge">{level}</span>}
          {language && (
            <span className="blu-scene-badge">
              Lang: {language.toUpperCase()}
            </span>
          )}
          {topic && <span className="blu-scene-badge">{topic}</span>}
        </div>
        <h1 className="blu-notes-title" data-testid="notes-title">
          {title}
        </h1>
        {summary && (
          <p className="blu-notes-summary" data-testid="notes-summary">
            {summary}
          </p>
        )}
      </div>

      {/* Learning Objectives */}
      {learning_objectives.length > 0 && (
        <section className="blu-notes-section" data-testid="notes-learning-objectives">
          <h2 className="blu-notes-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Learning Objectives
          </h2>
          <ul className="blu-notes-list">
            {learning_objectives.map((obj, idx) => (
              <li key={`obj-${idx}`}>{obj}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Key Concepts */}
      {key_concepts.length > 0 && (
        <section className="blu-notes-section" data-testid="notes-key-concepts">
          <h2 className="blu-notes-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Key Concepts
          </h2>
          <div className="blu-notes-grid">
            {key_concepts.map((concept, idx) => (
              <div key={`concept-${idx}`} className="blu-notes-card">
                <h3 className="blu-notes-card-title">{concept.term}</h3>
                <p className="blu-notes-card-desc">{concept.definition}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Step by Step Explanation */}
      {step_by_step_explanation.length > 0 && (
        <section className="blu-notes-section" data-testid="notes-steps">
          <h2 className="blu-notes-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Step-by-Step Breakdown
          </h2>
          <ol className="blu-notes-list" style={{ paddingLeft: 22 }}>
            {step_by_step_explanation.map((step, idx) => {
              if (typeof step === "string") {
                return <li key={`step-${idx}`}>{step}</li>;
              }
              return (
                <li key={`step-${idx}`} style={{ marginBottom: 8 }}>
                  <strong>{step.title}:</strong> {step.content}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Code Examples */}
      {examples.length > 0 && (
        <section className="blu-notes-section" data-testid="notes-examples">
          <h2 className="blu-notes-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Examples & Illustrations
          </h2>
          {examples.map((ex, idx) => (
            <div key={`ex-${idx}`} className="blu-notes-card" style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px 0", color: "var(--blu-text)" }}>
                {ex.description}
              </p>
              {ex.code && (
                <pre
                  style={{
                    background: "var(--blu-code-bg)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "var(--blu-radius-sm)",
                    padding: "10px 14px",
                    fontFamily: "var(--blu-font-mono)",
                    fontSize: 13,
                    color: "var(--blu-primary)",
                    overflowX: "auto",
                    margin: "6px 0",
                  }}
                >
                  <code>{ex.code}</code>
                </pre>
              )}
              {ex.output && (
                <div style={{ fontSize: 12, color: "var(--blu-success)", marginTop: 4 }}>
                  Output: <code>{ex.output}</code>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Key Takeaways */}
      {key_takeaways.length > 0 && (
        <section className="blu-notes-section" data-testid="notes-takeaways">
          <h2 className="blu-notes-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Key Takeaways
          </h2>
          <ul className="blu-notes-list">
            {key_takeaways.map((takeaway, idx) => (
              <li key={`takeaway-${idx}`}>{takeaway}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Revision Questions */}
      {revision_questions.length > 0 && (
        <section className="blu-notes-section" data-testid="notes-revision-questions">
          <h2 className="blu-notes-section-title">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Revision Questions
          </h2>
          {revision_questions.map((qa, idx) => (
            <div key={`qa-${idx}`} className="blu-notes-qa">
              <div className="blu-notes-q">Q{idx + 1}: {qa.question}</div>
              <div className="blu-notes-a">A: {qa.answer}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
