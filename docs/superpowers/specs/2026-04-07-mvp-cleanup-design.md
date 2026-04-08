# MVP Cleanup: Drop XcodeGen + Critical Path Tests

## Overview

Prepare the Note Trainer iOS app for MVP by removing the XcodeGen build tool dependency and expanding test coverage to catch silent failures in persistence and music theory math.

## 1. Drop XcodeGen

### Changes
- Delete `project.yml`
- Commit `NoteTrainer.xcodeproj/` to git as the source of truth
- Update `README.md`: remove `xcodegen generate` step, devs just open `.xcodeproj`
- Update `CLAUDE.md`: remove XcodeGen references from build commands

### What stays the same
- All source files, targets, schemes, signing config — untouched
- CLI build/test commands (`xcodebuild -scheme NoteTrainer ...`) work identically

## 2. Test Coverage — SessionStore

Using Swift Testing framework (`@Test`, `#expect`) with in-memory `UserDefaults(suiteName:)`.

### Tests (~5)
- **Persistence round-trip**: append a session, create a new `SessionStore` with the same `UserDefaults`, verify the session persists
- **Empty state**: fresh `UserDefaults` returns empty sessions array
- **Ordering**: sessions returned sorted by `startedAt` descending
- **Stats computation**: `stats(for:)` returns correct session count, total answers, and accuracy percentage
- **Filtering**: `sessions(for: modeID)` returns only matching sessions

## 3. Test Coverage — MusicTheory

### Tests (~4)
- **Semitone offset**: A4 = 0, C4 = -9, B5 = +14 — known values to catch lookup table errors
- **Frequency calculation**: A4 = 440.0 Hz, C4 ≈ 261.63 Hz — verified against concert pitch with floating point tolerance
- **Accidental offsets**: sharp = +1 semitone, flat = -1 semitone
- **noteReadingRange sanity**: 17 pitches, starts G3, ends B5, all `.natural`

## Out of Scope

All items in `docs/FUTURE_IMPROVEMENTS.md` — audio session reliability, data migration, audio quality, UX polish, code cleanup. These are deferred to post-MVP.
