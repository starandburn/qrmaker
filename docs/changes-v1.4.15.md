# v1.4.15

Refactor: type-utils / uiState / execution tokens
- Cleaned up type-utils helpers and execution token wiring so the UI flow relies on injected qrmakerDebug services.

Refactor: pattern-callers legacy rules
- Documented the removal of legacy guards and ensured pattern-callers respect only the qrmakerDebug hooks.

Update: runGuardedExecution + EXEC_STATUS
- Clarified runGuardedExecution transitions in the execution-flow notes and tightened EXEC_STATUS reporting.

Cleanup: removed layoutUI.applyDebugVisibility and debugUI/window services compat
- Alias code paths were removed so only qrmakerDebug.ui remains public.

Docs: execution-flow.md, fallbacks.md maintenance
- Recorded the completed phase removals and updated the fallbacks inventory notes.
