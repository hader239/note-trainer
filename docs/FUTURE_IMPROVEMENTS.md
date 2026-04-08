# Future Improvements

Issues and improvements identified during initial review, deferred until post-MVP polish.

## Audio Session Reliability
- `AudioService` has no lifecycle management — `AVAudioEngine` is started once, never stopped or recovered
- No `AVAudioSession.interruptionNotification` observer — if iOS interrupts audio (phone call, Siri), the engine dies silently
- `assertionFailure` on engine start failure is stripped in release builds — failure is completely silent in production

## Silent Data Loss in SessionStore
- Both load (`SessionStore.swift:15-18`) and save (`SessionStore.swift:46-48`) paths swallow errors with `try?`
- If `TrainingSession` model changes shape, `JSONDecoder` fails silently and returns `[]` — wipes user history
- No schema versioning or migration strategy

## Audio Quality
- iOS version uses bare sine wave with basic ADSR envelope
- Legacy web version had vibrato, detuned oscillators, peaking filters, convolution reverb, and rich timbre
- For a music training app, tone quality impacts pitch recognition learning

## UX Polish
- No haptic feedback on correct/incorrect answers — would improve responsiveness for rapid drill-style tapping
- `UIImpactFeedbackGenerator` is lightweight to add

## Build System
- Dropped XcodeGen for MVP (native `.xcodeproj` is simpler for solo development)
- Consider re-introducing XcodeGen (or migrating to Tuist) if the project grows to multiple targets, SPM packages, or team collaboration — declarative project files eliminate `.pbxproj` merge conflicts

## Code Cleanup
- `NoteAnswerButtonState` has a manual `stateHash` property — enum could just conform to `Hashable` (free for Swift enums), saving ~10 lines
- `noteReadingRange` in `MusicTheory.swift:57-75` is a hand-maintained list of 17 pitches — could be generated programmatically
- `Pitch` supports sharps/flats via `Accidental` but the entire app only uses `.natural` — speculative complexity until sharps/flats feature is built

## Manual Testing Findings (2026-04-07)

Issues and suggestions discovered during hands-on simulator testing (iPhone Air, iOS 26.4).

### Bugs

- **Home screen title "Note Trainer" is truncated** — renders as "N..." or "Not..." depending on scroll state. The title text element is ~34px wide, far too narrow for the full label. Subtitle "Native iPhone practice" also truncates to "Nativ..."
- **Header overlaps scrolled content** — when scrolling the home screen, the truncated title has no background/blur, so the hero card text scrolls visibly behind it
- **Settings button accessibility is misleading** — AXLabel is "Edit" and AXUniqueId is "slider.horizontal.3". Should be something like "Settings" for VoiceOver users
- **Audio sliders have no accessibility labels** — both Volume and Duration sliders have nil AXLabel, making them indistinguishable for VoiceOver

### UX Improvements

- **No confirmation dialog when leaving a training session** — tapping the X button immediately saves and closes the session with no "Are you sure?" prompt. Since the back-swipe gesture is disabled, an accidental X tap during fast drilling could end a session unexpectedly
- **Streak counter (flame icon) is unexplained** — new users have no way to know what the number next to the flame means (correct-answer streak). A tooltip or onboarding hint would help
- **Localization section in Settings is developer-facing** — the text reads "Add more Localizable.strings files to support more languages." Regular users don't know what `.strings` files are. Should either be rephrased for end users or hidden entirely
- **"Play Reference" button has no playing state** — tapping the button produces no visual change (no spinner, no "Playing..." label, no icon animation). Users can't tell if audio is playing, especially on muted simulators or devices
- **Answer button grid has an empty slot** — the second row shows G, A, B with a blank 4th position. Consider a 7-column single row, a centered layout, or filling the gap
- **Hero card takes significant vertical space** — the motivational banner is always visible on the home screen. Could be collapsible, dismissible, or shown only on first launch to give more room to stats and sessions
