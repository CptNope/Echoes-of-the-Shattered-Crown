# ADR-0006: Use validated local saves with independent recovery and portable backups

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

Browser sessions can close during combat. Players need a manual checkpoint, automatic recovery and a way to move progress without requiring an account.

## Decision

Use IndexedDB for local wrappers with separate manual/backup and recovery/recovery-backup slots. Validate through shared decoding; rotate valid prior records transactionally. Serialize recovery writes within a page and gate startup gameplay until recovery review completes. Export/import bounded JSON through a candidate-review flow. Keep database schema, game format and portable envelope versions distinct.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Only manual saves | Does not recover an unexpected close after the last checkpoint. |
| One autosave overwrites the manual slot | Removes the player's independent restore point. |
| Cloud sync first | Requires separate account, privacy, cost, offline and conflict decisions. |
| Accept imported JSON directly | Bypasses size/version/content validation and review. |

## Consequences

The current formats are IndexedDB schema 1, Expedition/Battle v2 and portable envelope v1. Export/import limits are measured in UTF-8 bytes. Saves remain origin/profile-local; same-origin tabs can still overwrite later. Supported v1 battle migration is specific, not a universal migration chain.

## Evidence and verification

[storage.ts](../../src/storage.ts), [portable.ts](../../src/portable.ts), [BackupDialog.tsx](../../src/BackupDialog.tsx), [campaign.ts](../../src/campaign.ts) and [portable.test.ts](../../src/portable.test.ts) implement the boundaries. See [backups/recovery](../BACKUPS_AND_RECOVERY.md).

## Revisit conditions

D-12/D-13 and SAV work cover future formats, multi-tab conflicts and offline activation. A new board/roster shape needs migration evidence before required save fields change.

## Related records

- [ADR-0004](0004-separate-company-and-battle-state.md)
- [ADR-0010](0010-proposed-variable-board-and-roster-contract.md)

