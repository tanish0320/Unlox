"""
Offline Knowledge Base and Document Grounding Service for Blu Visual Teacher.

Capabilities:
1. Pure local offline document ingestion (PDF via PyMuPDF/pypdf, Markdown, TXT).
2. SQLite FTS5 full-text indexing with BM25 ranking for sub-millisecond lexical search.
3. Preserves exact provenance: source filename, page number, chunk index, excerpt.
4. Distinguishes verified local source evidence from unverified model generations.
5. Zero cloud network calls, zero external vector embedding models required.
"""

import os
import re
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class EvidencePassage(BaseModel):
    source_name: str = Field(..., description="Filename or title of source document")
    page_number: Optional[int] = Field(None, description="1-indexed document page number")
    chunk_index: int = Field(default=0, description="Sequential passage chunk index")
    excerpt: str = Field(..., description="Exact textual excerpt supporting the topic")
    score: float = Field(default=0.0, description="Relevance ranking score (lower BM25 is better match)")
    verified: bool = Field(default=True, description="True if grounded in verified local document")


class IngestResult(BaseModel):
    filename: str
    num_pages: int
    num_passages: int
    status: str


# Core verified knowledge seeds for offline baseline without requiring internet
DEFAULT_FOUNDATIONAL_SEEDS: List[Dict[str, Any]] = [
    {
        "filename": "ancient_civilizations_reference.md",
        "title": "Ancient River Valley Civilizations: Foundations of Urban Society",
        "pages": [
            {
                "page": 1,
                "text": (
                    "The earliest human civilizations developed along major river valleys: the Nile in Egypt, "
                    "the Tigris and Euphrates in Mesopotamia, the Indus Valley along the Indus and Saraswati rivers, "
                    "and the Yellow River (Huang He) in China. These river valleys provided fertile alluvial silt "
                    "deposited by seasonal flooding, fresh water for consumption and agriculture, and natural "
                    "transportation routes connecting communities."
                ),
            },
            {
                "page": 2,
                "text": (
                    "In the Indus Valley Civilization (mature Harappan phase c. 2600-1900 BCE), cities such as "
                    "Harappa and Mohenjo-daro featured unprecedented urban planning. Streets were arranged in a strict "
                    "grid oriented to cardinal directions. Cities included standardized kiln-baked brick architecture, "
                    "sophisticated underground drainage systems with inspection manholes, public granaries, and the "
                    "Great Bath of Mohenjo-daro. The civilization engaged in extensive maritime and overland trade with "
                    "Mesopotamia (where they were known as Meluhha), exporting carnelian beads, copper, and cotton textiles."
                ),
            },
            {
                "page": 3,
                "text": (
                    "Mesopotamia between the Tigris and Euphrates rivers required complex canal irrigation networks to "
                    "manage irregular and unpredictable flooding. This shared hydraulic infrastructure spurred centralized "
                    "civic administration, the development of cuneiform writing on clay tablets for accounting, and the "
                    "codification of formal statutory law, famously exemplified by the Code of Hammurabi."
                ),
            },
        ],
    },
    {
        "filename": "mathematics_pythagoras_reference.md",
        "title": "The Pythagorean Theorem: Geometric and Algebraic Foundations",
        "pages": [
            {
                "page": 1,
                "text": (
                    "The Pythagorean Theorem is a fundamental theorem in Euclidean geometry stating that in any right-angled "
                    "triangle, the square of the length of the hypotenuse (the side opposite the right angle) is equal to "
                    "the sum of the squares of the lengths of the other two sides (legs). Algebraically, this is expressed as: "
                    "a² + b² = c², where 'a' and 'b' represent the perpendicular leg lengths, and 'c' is the hypotenuse."
                ),
            },
            {
                "page": 2,
                "text": (
                    "Geometrically, the theorem can be interpreted as area equivalence: if a square is constructed on each side "
                    "of the right triangle, the area of the square on the hypotenuse (c × c = c²) exactly equals the combined "
                    "areas of the squares constructed on the two legs (a² + b²). For example, with legs of length 3 and 4: "
                    "3² + 4² = 9 + 16 = 25 = 5². The triplet (3, 4, 5) forms the most famous primitive Pythagorean triple. "
                    "Other common integer triples include (5, 12, 13) and (8, 15, 17)."
                ),
            },
            {
                "page": 3,
                "text": (
                    "To calculate the unknown hypotenuse of a right triangle with legs a = 6 and b = 8: "
                    "first square both legs: 6² = 36 and 8² = 64. Sum the squares: 36 + 64 = 100. "
                    "Finally, extract the principal square root: c = √100 = 10. "
                    "The theorem is widely applied in coordinate geometry for the Euclidean distance formula: "
                    "d = √((x₂ - x₁)² + (y₂ - y₁)²), as well as in navigation, architecture, and computer graphics."
                ),
            },
        ],
    },
    {
        "filename": "biology_photosynthesis_reference.md",
        "title": "Photosynthesis: Biochemical Energetics of the Plant Cell",
        "pages": [
            {
                "page": 1,
                "text": (
                    "Photosynthesis is the biochemical process by which photoautotrophic organisms (plants, algae, and cyanobacteria) "
                    "convert radiant light energy into chemical energy stored in glucose molecules. The overall stoichiometric equation "
                    "is: 6CO₂ + 6H₂O + light photons → C₆H₁₂O₆ + 6O₂. Carbon dioxide and water are consumed to produce glucose and oxygen gas."
                ),
            },
            {
                "page": 2,
                "text": (
                    "Photosynthesis occurs within specialized cell organelles called chloroplasts. Inside chloroplasts, flattened disc-like "
                    "membranes called thylakoids contain chlorophyll pigments that absorb blue and red wavelengths of sunlight while reflecting "
                    "green. In the light-dependent reactions on thylakoid membranes, photolysis splits water (H₂O) into protons, electrons, and O₂. "
                    "This generates ATP and NADPH via photosynthetic electron transport."
                ),
            },
            {
                "page": 3,
                "text": (
                    "In the light-independent reactions (Calvin Cycle), which occur in the aqueous stroma of the chloroplast, "
                    "the enzyme RuBisCO fixes atmospheric carbon dioxide (CO₂) using energy from ATP and reducing power from NADPH. "
                    "This synthesizes glyceraldehyde 3-phosphate (G3P), which the plant assembles into glucose and starch for long-term storage."
                ),
            },
        ],
    },
    {
        "filename": "physics_mechanics_reference.md",
        "title": "Classical Mechanics: Newton's Laws of Motion and Dynamics",
        "pages": [
            {
                "page": 1,
                "text": (
                    "Sir Isaac Newton formulated three fundamental physical laws governing the motion of material bodies. "
                    "Newton's First Law (Law of Inertia) states that an object at rest remains at rest, and an object in uniform motion "
                    "continues moving in a straight line with constant velocity, unless acted upon by a non-zero net external force."
                ),
            },
            {
                "page": 2,
                "text": (
                    "Newton's Second Law establishes the quantitative relationship between force, mass, and acceleration: F_net = m · a. "
                    "Net force F (measured in Newtons, N) equals the inertial mass m (in kilograms, kg) multiplied by the resulting "
                    "acceleration a (in meters per second squared, m/s²). If a 10 N net force is applied to a 2 kg block, its acceleration "
                    "is a = F/m = 10 / 2 = 5 m/s²."
                ),
            },
            {
                "page": 3,
                "text": (
                    "Newton's Third Law (Action and Reaction) states that whenever object A exerts a force on object B, object B "
                    "simultaneously exerts an equal and opposite force on object A: F_AB = -F_BA. These forces form action-reaction pairs "
                    "acting on two different interacting bodies, explaining rocket propulsion, swimming, and normal contact forces."
                ),
            },
        ],
    },
    {
        "filename": "computer_science_loops_reference.md",
        "title": "Algorithmic Control Flow: Iteration and Loops in Python",
        "pages": [
            {
                "page": 1,
                "text": (
                    "In computer science, iteration enables a program to execute a block of instructions repeatedly until a specified "
                    "condition is satisfied. In Python, the 'for' loop iterates over sequential collections such as lists, strings, or "
                    "generated arithmetic sequences from range(). For example, 'for i in range(3):' executes its body 3 times with i = 0, 1, 2."
                ),
            },
            {
                "page": 2,
                "text": (
                    "A 'while' loop continues execution as long as its Boolean condition evaluates to True. The loop control variable "
                    "must be updated within the loop body to avoid an infinite loop. Iteration structures reduce code duplication, "
                    "enforce DRY (Don't Repeat Yourself) design principles, and process large datasets efficiently."
                ),
            },
        ],
    },
]


class LocalKnowledgeBase:
    """
    Manages local document indexing, SQLite FTS5 search, and provenance tracking.
    """

    def __init__(self, db_path: Optional[Path] = None):
        if db_path is None:
            db_path = Path(__file__).resolve().parent / "knowledge.db"
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()
        self._seed_default_knowledge_if_empty()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            # Metadata table for indexed documents
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS documents (
                    doc_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    num_pages INTEGER DEFAULT 1,
                    num_passages INTEGER DEFAULT 0,
                    ingested_at REAL NOT NULL
                )
                """
            )
            # FTS5 Virtual Table for full-text search with BM25
            conn.execute(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(
                    content,
                    filename,
                    page_number UNINDEXED,
                    chunk_index UNINDEXED,
                    doc_id UNINDEXED,
                    tokenize = 'porter unicode61'
                )
                """
            )
            conn.commit()

    def _seed_default_knowledge_if_empty(self):
        with self._get_connection() as conn:
            cur = conn.execute("SELECT COUNT(*) as cnt FROM documents")
            count = cur.fetchone()["cnt"]
            if count > 0:
                return

        # Seed the default reference documents
        for seed in DEFAULT_FOUNDATIONAL_SEEDS:
            doc_id = f"seed_{seed['filename'].replace('.', '_')}"
            passages: List[Tuple[str, str, int, int, str]] = []
            for p_idx, p in enumerate(seed["pages"]):
                passages.append((
                    p["text"],
                    seed["filename"],
                    p["page"],
                    p_idx + 1,
                    doc_id,
                ))

            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO documents (doc_id, filename, file_type, title, num_pages, num_passages, ingested_at)
                    VALUES (?, ?, 'md', ?, ?, ?, ?)
                    """,
                    (doc_id, seed["filename"], seed["title"], len(seed["pages"]), len(passages), time.time()),
                )
                conn.executemany(
                    """
                    INSERT INTO passages_fts (content, filename, page_number, chunk_index, doc_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    passages,
                )
                conn.commit()

    def ingest_file(self, file_path: Path) -> IngestResult:
        """
        Parses and indexes a local file (.pdf, .txt, .md).
        Preserves page numbers and chunk offsets.
        """
        file_path = Path(file_path).resolve()
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = file_path.suffix.lower()
        filename = file_path.name
        doc_id = f"doc_{int(time.time())}_{re.sub(r'[^a-zA-Z0-9]', '_', filename)}"

        pages_text: List[Tuple[int, str]] = []

        if ext == ".pdf":
            # Attempt fitz (PyMuPDF) first
            try:
                import fitz
                doc = fitz.open(str(file_path))
                for page_num in range(len(doc)):
                    p = doc[page_num]
                    t = p.get_text().strip()
                    if t:
                        pages_text.append((page_num + 1, t))
                doc.close()
            except ImportError:
                import pypdf
                reader = pypdf.PdfReader(str(file_path))
                for idx, p in enumerate(reader.pages):
                    t = (p.extract_text() or "").strip()
                    if t:
                        pages_text.append((idx + 1, t))
        else:
            # Plain text / Markdown
            raw = file_path.read_text(encoding="utf-8", errors="ignore")
            # Break by double newlines or form feeds into logical pages
            sections = [s.strip() for s in re.split(r"\n\s*\n\s*\n|(?:\f)", raw) if s.strip()]
            if not sections:
                sections = [raw.strip()]
            for p_num, sec in enumerate(sections, start=1):
                pages_text.append((p_num, sec))

        if not pages_text:
            return IngestResult(filename=filename, num_pages=0, num_passages=0, status="empty_file")

        # Chunk pages into passages (~100-150 words)
        passages: List[Tuple[str, str, int, int, str]] = []
        chunk_counter = 0

        for page_num, text in pages_text:
            words = text.split()
            chunk_size = 120
            overlap = 20
            step = chunk_size - overlap

            for i in range(0, max(1, len(words)), step):
                chunk_words = words[i:i + chunk_size]
                if not chunk_words:
                    continue
                passage_text = " ".join(chunk_words)
                chunk_counter += 1
                passages.append((passage_text, filename, page_num, chunk_counter, doc_id))
                if i + chunk_size >= len(words):
                    break

        title = filename.rsplit(".", 1)[0].replace("_", " ").title()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO documents (doc_id, filename, file_type, title, num_pages, num_passages, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (doc_id, filename, ext.lstrip("."), title, len(pages_text), len(passages), time.time()),
            )
            conn.executemany(
                """
                INSERT INTO passages_fts (content, filename, page_number, chunk_index, doc_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                passages,
            )
            conn.commit()

        return IngestResult(
            filename=filename,
            num_pages=len(pages_text),
            num_passages=len(passages),
            status="indexed",
        )

    def search(self, query: str, limit: int = 4) -> List[EvidencePassage]:
        """
        Executes an offline SQLite FTS5 search using BM25 ranking.
        Sanitizes search query for FTS5 syntax.
        """
        clean_tokens = [w for w in re.findall(r"[a-zA-Z0-9]+", query.lower()) if len(w) > 2]
        if not clean_tokens:
            return []

        # Join tokens with OR or AND
        fts_query = " OR ".join(f'"{tok}"*' for tok in clean_tokens)

        with self._get_connection() as conn:
            try:
                cur = conn.execute(
                    """
                    SELECT content, filename, page_number, chunk_index, bm25(passages_fts) as rank
                    FROM passages_fts
                    WHERE passages_fts MATCH ?
                    ORDER BY rank ASC
                    LIMIT ?
                    """,
                    (fts_query, limit),
                )
                rows = cur.fetchall()
            except sqlite3.OperationalError:
                return []

            results: List[EvidencePassage] = []
            for r in rows:
                results.append(
                    EvidencePassage(
                        source_name=r["filename"],
                        page_number=int(r["page_number"]) if r["page_number"] is not None else None,
                        chunk_index=int(r["chunk_index"]) if r["chunk_index"] is not None else 0,
                        excerpt=r["content"],
                        score=round(float(r["rank"]), 4),
                        verified=True,
                    )
                )
            return results

    def get_stats(self) -> Dict[str, Any]:
        """Returns statistics on the local offline knowledge store."""
        with self._get_connection() as conn:
            d_cur = conn.execute("SELECT COUNT(*) as count FROM documents")
            doc_count = d_cur.fetchone()["count"]

            p_cur = conn.execute("SELECT COUNT(*) as count FROM passages_fts")
            passage_count = p_cur.fetchone()["count"]

            docs = conn.execute("SELECT filename, file_type, num_pages, num_passages, title FROM documents").fetchall()
            doc_list = [dict(d) for d in docs]

            return {
                "total_documents": doc_count,
                "total_passages": passage_count,
                "documents": doc_list,
                "offline_ready": True,
            }


# Singleton instance for easy import across services
_GLOBAL_KB: Optional[LocalKnowledgeBase] = None


def get_knowledge_base() -> LocalKnowledgeBase:
    global _GLOBAL_KB
    if _GLOBAL_KB is None:
        _GLOBAL_KB = LocalKnowledgeBase()
    return _GLOBAL_KB
