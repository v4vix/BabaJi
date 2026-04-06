# Admin Guide

## Upload pipeline
1. Upload document (`/v1/admin/upload`) from Admin Studio.
2. OCR and chunking pipeline placeholder stores source artifact.
3. Retrieval index is refreshed with source IDs and locators.

## Supported formats target
- PDF, scanned PDF, ePub, DjVu, TXT, HTML, DOCX.

## Governance
- Version each upload.
- Keep audit trail for ingestion and indexing events.
- Apply tier gating metadata at source/chunk level.
