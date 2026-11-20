# Audio node, music timeline and cue specification

[Blueprint index](README.md) · [Audio studio](../AUDIO_STUDIO.md) · [Project source format](../PROJECT_FORMAT.md)

**Blueprint BP-AUDIO, proposed.** Coverage: STREQ-14/15/16/17/20/22. This is a source/DSP/editor contract; the current AudioScore does not implement these nodes or timelines.

## Node types and ports

The initial prototype deliberately uses a small approved graph vocabulary. Extension nodes require versioned port, scheduling, render and export contracts.

| Node | Inputs | Outputs | Key parameters |
| --- | --- | --- | --- |
| Oscillator | Optional pitch/modulation control | Audio | Wave, frequency, phase/start and local seed where relevant |
| Noise | Optional amplitude/color control | Audio | Noise family and explicit cosmetic/render seed |
| Sample | Trigger/pitch/start control | Audio | Source ID, region, rate, loop and channel mapping |
| Envelope | Gate/trigger | Control | Attack/decay/sustain/release and interpolation |
| Gain | Audio plus gain control | Audio | Base gain and modulation policy |
| Filter | Audio plus parameter control | Audio | Type, frequency, resonance and stability limits |
| Mixer | Named audio inputs | Audio | Input gains, channel policy and sends |
| Output | Audio | Declared bus/output | Target bus, gain and channel policy |

Port kinds must match. Audio-to-control conversion requires an explicit approved adapter. Cyclic graphs require a specifically supported delay/feedback contract; the first example/pilot can reject cycles.

For this prototype contract, a cue or musical note creates a voice and supplies its gate/trigger to unconnected envelope/sample trigger ports. Note release enters the envelope release stage. Unconnected parameter-control ports use their declared constant/default. Required audio-signal inputs must be connected; silence or implicit routing must not be guessed by the editor.

## Scheduling and units

| Value | Proposed representation | Acceptance |
| --- | --- | --- |
| Source/sample region | Integer sample frames and source sample rate | start < end and within source |
| Envelope | Milliseconds or explicitly tagged sample frames | Positive/nonnegative ranges; sustain in approved normalized range |
| Music note | Integer musical ticks, MIDI pitch and normalized velocity | Start/duration within pattern and declared tick resolution |
| Tempo | Ordered tempo events in beats per minute | Positive bounded policy; conversion boundary documented |
| Meter | Numerator and beat-unit denominator | Valid meter and bar display |
| Automation | Ordered points with interpolation and target parameter | Valid target, value range and endpoint semantics |
| Cue clock | Named presentation/audio policy | No combat RNG or renderer-dependent rules |
| Offline render | Project sample rate, duration, seed and toolchain | Declared realtime/offline/runtime parity |

The [audio example](../specs/examples/audio.json) contains an impact graph, simple instrument graph, music pattern and cue. Its validation checks structure/units only; no audio is rendered by the documentation checker.

## Music timeline contract

| Entity | Required source |
| --- | --- |
| Instrument | Stable graph ID and pitch/key/sample mapping |
| Pattern | Stable note IDs, tick length and instrument reference |
| Arrangement clip | Pattern/region reference, start, repeats and local transforms |
| Track | Instrument/bus, mute/solo and automation |
| Tempo/meter map | Ordered events with a declared conversion policy |
| Loop | Start/end in musical or sample time; explicit tails/crossfade |
| Stem | Named routing/output selection and aligned render start |
| Adaptive transition | Source/target state, musical boundary and interruption policy |

Notes and arrangements remain canonical source. A bounced track is not a replacement for the score. Reordering a pattern reference must not silently rewrite every reused pattern's notes.

## SFX graph workflow

```mermaid
flowchart LR
    Design[Choose event and sound intent] --> Layers[Add oscillator, noise or sample layers]
    Layers --> Envelope[Shape amplitude and pitch envelopes]
    Envelope --> Process[Filters, modulation and mix]
    Process --> Audition[Audition solo and in game]
    Audition --> Bind[Bind stable cue and variant policy]
    Bind --> Export[Compile/render with source preserved]
```

| Step | Required controls |
| --- | --- |
| New sound | Empty graph or editable recipe; no external finished file required |
| Layer selection | Node IDs, names, mute/solo and source provenance |
| Envelope edit | Visual curve plus numeric units/ranges |
| Sample edit | Region markers, fades, reverse and non-destructive processing |
| Variation | Weights, pitch/gain ranges, seed and deterministic local policy |
| Audition | Stop/retrigger, loop region, mixer route and game-context playback |
| Bind | Hit/miss/cast/step/UI/prop/phase event and one-shot/state policy |
| Export | Source graph/recording retained alongside runtime derivative |

## Cue definition

| Field | Required behavior |
| --- | --- |
| Cue ID | Stable project identity |
| Event selector | Approved resolved/UI/ambience event plus result filter |
| Source | Graph/sample/stem/state reference |
| Bus | Valid mixer bus; not a live device object |
| Variant weights | Positive normalized-or-normalizable weights and declared selection policy |
| Voice cap | Positive finite max voices and steal/drop policy |
| Cooldown | Explicit duration/clock/group; distinguish a retrigger from replay |
| Spatial | Presentation anchor, pan/distance and optional occlusion contract |
| On load | Suppress historical one-shots; restore stateful music/ambience appropriately |
| Accessibility | Critical gameplay meaning also available visually/textually |

A hit-filtered cue must not fire for a miss. An ambience state can resume without replaying old impacts. Imported cue definitions cannot change combat hit rolls or spend gameplay resources.

## Diagnostics

| Code family | Example | Editor response |
| --- | --- | --- |
| AUDIO-PORT | Audio output connected to a control-only input | Highlight edge and compatible port types |
| AUDIO-CYCLE | Unsupported feedback loop | Identify cycle and approved delay/feedback alternatives |
| AUDIO-REGION | Trim/loop outside original source frames | Show source bounds and invalid markers |
| AUDIO-TIME | Invalid duration, tempo, tick or automation order | Identify unit, field and allowed policy |
| AUDIO-REFERENCE | Missing graph/instrument/sample/bus | Show usage and remap choices |
| AUDIO-CODEC | Unsupported required decode/encode path | Preserve source; offer supported conversion/export target |
| AUDIO-PARITY | Preview/offline/runtime output differs beyond declared tolerance | Record graph/toolchain/rate/seed and comparison |
| AUDIO-VOICE | Budget/priority policy exceeded | Apply declared drop/steal behavior and expose diagnostics |

## Acceptance

Edit a note and envelope through UI and API, render/audition under the same graph version, bind separate hit/miss cues, test voice stealing/cooldown/mute/resume, export complete-game sources and reopen them. Pixel/source hashes and graph equality do not prove audio quality; listening, mix/loop review and target-device measurements remain separate.

