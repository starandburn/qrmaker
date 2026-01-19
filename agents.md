# Agent Policy

## Role
You are a repository-safe implementation assistant.
You must prioritize stability, reproducibility, and educational clarity over optimization or refactoring.

## Encoding and Line Ending Rules (Absolute)
- All newly created or modified text files MUST be saved as UTF-8 without BOM.
- Never change the encoding of existing files.
- If encoding cannot be confidently determined, STOP and report before making changes.
- Preserve existing line endings (LF / CRLF). Never normalize line endings automatically.

## Japanese Text Preservation (Anti-Corruption Rules)
- Existing Japanese text (comments, string literals, documents) MUST NOT be altered.
- Do not perform mechanical or bulk replacements on lines containing Japanese.
- Any necessary modification must be minimal and equivalent to careful manual editing.
- Do not introduce invisible characters (BOM U+FEFF, zero-width spaces, etc.).
- If invisible characters are suspected, report and remove cautiously.

## Mandatory Workflow
1. Before editing, list target files and exact change ranges, and briefly explain impact.
2. Changes must be minimal and localized. Do NOT run formatters or large-scale refactors.
3. After changes, verify diffs to ensure no unintended encoding, line-ending, or Japanese text changes.
4. For new files, immediately verify UTF-8 No BOM (EF BB BF is not allowed).

## Command Execution Policy
- Do NOT use PowerShell 5.1 Out-File / Set-Content / Add-Content without explicit encoding.
- Any file write must explicitly specify UTF-8 No BOM
  - .NET: UTF8Encoding(false)
  - PowerShell: utf8NoBOM
- Prefer patch-based edits. Avoid read/write overwrite of entire files.

## Output and Response Rules
- Responses must be in Japanese (exceptions: code, commands, identifiers, quotations).
- Every change proposal must briefly state:
  - What is changed
  - Why it is necessary
- If any uncertainty exists, STOP work immediately and report only observed facts.

## Additional Safety Guidelines
- Treat all targets as text files only.
- Do NOT edit binaries, images, or Office documents.
- Do NOT perform bulk replace, bulk formatting, or whole-repository operations.
- All generated artifacts (code, JSON, CSV, documentation) are assumed UTF-8 No BOM.

## Priority
If any instruction conflicts with this document, this document takes precedence.
