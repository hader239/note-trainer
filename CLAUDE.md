# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Note Trainer — a native iOS app for practicing music note reading on the treble clef staff. Supports English and Russian localization. Originally a web prototype (archived in `legacy-web/`), now fully rewritten in SwiftUI.

## Build & Development

```bash
# Build from command line
xcodebuild -scheme NoteTrainer -destination 'platform=iOS Simulator,name=iPhone Air' build

# Run all tests (unit + UI) via the NoteTrainer scheme
xcodebuild -scheme NoteTrainer -destination 'platform=iOS Simulator,name=iPhone Air' test
```

- **Deployment target:** iOS 17.0
- **Swift version:** 5.0
- **Zero external dependencies** — only Apple frameworks (SwiftUI, AVFAudio, Combine, Foundation)

## Architecture

Feature-based MVVM-lite structure:

```
NoteTrainer/
├── App/          # Entry point, NavigationStack routing (AppRoute enum)
├── Features/     # Self-contained feature modules
│   ├── Home/           # Dashboard with stats + mode cards
│   ├── NoteReading/    # Training UI + session engine (game logic)
│   ├── Settings/       # Audio settings (volume, duration)
│   └── Training/       # Pluggable mode registry
└── Shared/
    ├── Domain/   # Pitch, NoteLetter, Accidental, NoteNamingService
    ├── Models/   # TrainingSession, AudioSettings, TrainingModeID
    ├── Services/ # SessionStore, SettingsStore, AudioService (all ObservableObject)
    └── UI/       # Reusable views: StaffView (Canvas), PrimaryButton, StatCard
```

**Key patterns:**
- Services are injected via `@EnvironmentObject` from the app root
- `NoteReadingSessionEngine` is the game-logic state machine — accepts an injectable `notePicker` closure for testability
- `TrainingModeRegistry` holds descriptors for all training modes — currently only Note Reading, but designed to plug in new modes (intervals, rhythm, etc.) without touching the app shell
- Staff rendering uses SwiftUI `Canvas` (not a UIKit view)
- Persistence is UserDefaults + JSON encoding (no Core Data)

## Localization

All user-facing text lives in `en.lproj/Localizable.strings` and `ru.lproj/Localizable.strings`. Note names are localized through `NoteNamingService` (e.g., "C" vs "До"). Never hardcode display strings in views.

## Testing

- **Unit tests** (`NoteTrainerTests/`): Use Swift Testing framework (`@Test`, `#expect`). Engine tests inject a mock `notePicker` to control pitch sequences.
- **UI tests** (`NoteTrainerUITests/`): Use XCTest. Launch arguments (`--open-note-reading`, `--open-settings`) supported via `AppLaunchConfiguration` for direct navigation in tests.

## Key Design Docs

- `IOS_BLUEPRINT.md` — full architecture plan and phased implementation roadmap
- `AGENT_NOTES.md` — mapping from legacy web concepts to iOS equivalents
