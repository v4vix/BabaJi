from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


SUPPORTED_EXTENSIONS = {".pdf", ".epub", ".djvu", ".txt", ".html", ".docx"}


@dataclass
class IngestionPlan:
    file_path: str
    extension: str
    ocr_engine: str
    chunk_strategy: str


def build_plan(path: Path) -> IngestionPlan:
    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")
    ocr_engine = "tesseract" if ext in {".pdf", ".djvu"} else "none"
    chunk_strategy = "semantic-window-with-locator"
    return IngestionPlan(file_path=str(path), extension=ext, ocr_engine=ocr_engine, chunk_strategy=chunk_strategy)
