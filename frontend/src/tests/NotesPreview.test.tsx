import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotesPreview } from "../components/NotesPreview";
import { sampleNotes } from "../fixtures/sampleNotes";
import { LessonNotes } from "../components/scenes/sceneTypes";

describe("NotesPreview Component", () => {
  it("renders complete structured notes with all sections", () => {
    render(<NotesPreview notes={sampleNotes} />);
    expect(screen.getByTestId("blu-notes-preview")).toBeInTheDocument();
    expect(screen.getByTestId("notes-title")).toHaveTextContent("Mastering Python For Loops");
    expect(screen.getByTestId("notes-summary")).toBeInTheDocument();
    expect(screen.getByTestId("notes-learning-objectives")).toBeInTheDocument();
    expect(screen.getByTestId("notes-key-concepts")).toBeInTheDocument();
    expect(screen.getByTestId("notes-steps")).toBeInTheDocument();
    expect(screen.getByTestId("notes-examples")).toBeInTheDocument();
    expect(screen.getByTestId("notes-takeaways")).toBeInTheDocument();
    expect(screen.getByTestId("notes-revision-questions")).toBeInTheDocument();
  });

  it("handles empty or partial notes safely without crashing", () => {
    const minimalNotes: LessonNotes = {
      title: "Minimal Topic",
      language: "en",
      level: "beginner",
      summary: "Short summary only.",
      learning_objectives: [],
      key_concepts: [],
      step_by_step_explanation: [],
      examples: [],
      key_takeaways: [],
      revision_questions: [],
    };

    render(<NotesPreview notes={minimalNotes} />);
    expect(screen.getByTestId("notes-title")).toHaveTextContent("Minimal Topic");
    expect(screen.queryByTestId("notes-learning-objectives")).not.toBeInTheDocument();
    expect(screen.queryByTestId("notes-key-concepts")).not.toBeInTheDocument();
  });

  it("handles null / undefined notes gracefully", () => {
    render(<NotesPreview notes={null as any} />);
    expect(screen.getByTestId("blu-notes-empty")).toBeInTheDocument();
  });

  it("renders non-Latin multilingual scripts directly without corruption", () => {
    const hindiNotes: LessonNotes = {
      title: "पायथन लूप अध्ययन नोट्स",
      language: "hi",
      level: "शुरुआती",
      summary: "लूप की पुनरावृत्ति और सिंटैक्स को समझें।",
      learning_objectives: ["लूप के कार्य को समझना।"],
      key_concepts: [{ term: "पुनरावृत्ति (Iteration)", definition: "बार-बार कोड चलाना।" }],
      step_by_step_explanation: ["चरण 1: लूप शुरू होता है।"],
      examples: [{ description: "उदाहरण कोड", code: "for x in [1, 2]: print(x)" }],
      key_takeaways: ["इंडेंटेशन आवश्यक है।"],
      revision_questions: [{ question: "लूप कब रुकता है?", answer: "जब सूची खाली हो जाती है।" }],
    };

    render(<NotesPreview notes={hindiNotes} />);
    expect(screen.getByTestId("notes-title")).toHaveTextContent("पायथन लूप अध्ययन नोट्स");
    expect(screen.getByText("पुनरावृत्ति (Iteration)")).toBeInTheDocument();
  });
});
