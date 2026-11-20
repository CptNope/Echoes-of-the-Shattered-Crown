# ADR-0012: Propose shared editable music, SFX and audio runtime contracts

[ADR index](README.md) · [Studio plan](../studio/README.md)

- Status: Proposed
- Recorded: 2026-11-19
- Decision date: Not decided
- Origin: Studio planning proposal
- Supersedes: None
- Superseded by: None

## Context

The current synthesized AudioScore sketch and command tones are not a complete audio authoring system. The proposed studio needs music composition and original sound-effect synthesis/sampling, with editable sources and consistent in-game playback.

## Decision

Proposed direction: serialize music notes/patterns/arrangements, instruments, SFX graphs, source recordings/edit lists, mixer routing and cue bindings. Use approved shared scheduling/DSP semantics for realtime audition, offline bounce and exported playback. Preserve masters and graph data alongside rendered derivatives. Route cosmetic cue variation separately from combat RNG and deduplicate resolved events on load.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Only import finished songs/SFX files | Useful as an adapter, but cannot provide native note/graph/layer editing. |
| Separate DSP implementations for editor and runtime | Risks different envelopes, loops, modulation and mixing after export. |
| Store live browser AudioNode objects as project state | Does not form a portable versioned source format. |

## Consequences

If adopted, music and SFX become first-class editable sources and complete exports can reopen them. This requires explicit audio graph/API versions, clocks, source/codec adapters, processing budgets and a defined parity tolerance. Required export paths must fail clearly when a needed codec/node is unsupported.

## Evidence and verification

[Audio studio](../studio/AUDIO_STUDIO.md), [automation](../studio/AUTOMATION_AND_EXTENSION_API.md) and [acceptance cases](../studio/ACCEPTANCE_AND_ROUNDTRIP.md) cover synthesis, sampling, recording, waveform edits, notes/stems, ambience/voice, mixing and cue policies. SD-04/SD-07 and event-ordering work remain open.

## Revisit conditions

Accept only after composing music, creating a layered original SFX, editing a recording, routing/binding cues, comparing preview/bounce/runtime and re-editing sources after complete-game export/import. Revisit node/codec contracts when supported targets or DSP extensions change.

## Related records

- [ADR-0002](0002-deterministic-simulation-boundary.md)
- [ADR-0007](0007-result-driven-bounded-presentation.md)
- [ADR-0011](0011-proposed-editable-game-project-and-build-artifacts.md)

