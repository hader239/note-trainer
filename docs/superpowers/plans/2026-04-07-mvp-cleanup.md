# MVP Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove XcodeGen dependency and add critical-path tests for SessionStore and MusicTheory.

**Architecture:** No architectural changes. Add two new test files first, run `xcodegen generate` one final time so the `.xcodeproj` picks them up, then delete `project.yml` and update docs.

**Tech Stack:** Swift 5.0, Swift Testing framework (`@Test`, `#expect`), `xcodebuild` CLI

---

## File Structure

```
Changes:
  CREATE:  NoteTrainerTests/SessionStoreTests.swift      — 5 persistence tests
  CREATE:  NoteTrainerTests/MusicTheoryTests.swift       — 4 math tests
  DELETE:  project.yml
  MODIFY:  README.md                                    — remove xcodegen step
  MODIFY:  CLAUDE.md                                    — remove xcodegen references
```

---

### Task 1: SessionStore Tests

**Files:**
- Create: `NoteTrainerTests/SessionStoreTests.swift`

**Context:** `SessionStore` (`NoteTrainer/Shared/Services/SessionStore.swift`) is `@MainActor`, uses `UserDefaults` injection, and exposes `append(_:)`, `sessions(for:)`, and `stats(for:)`. `TrainingSession` has fields: `id`, `modeID`, `startedAt`, `endedAt`, `totalAnswers`, `correctAnswers`. `SessionStats` has: `sessions`, `totalAnswers`, `accuracy` (optional Int).

- [ ] **Step 1: Write all SessionStore tests**

Create `NoteTrainerTests/SessionStoreTests.swift`:

```swift
import Testing
@testable import NoteTrainer
import Foundation

struct SessionStoreTests {
    private func makeDefaults() -> UserDefaults {
        let suite = "test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }

    private func makeSession(
        modeID: TrainingModeID = .noteReading,
        startedAt: Date = Date(timeIntervalSince1970: 1000),
        endedAt: Date = Date(timeIntervalSince1970: 2000),
        totalAnswers: Int = 10,
        correctAnswers: Int = 7
    ) -> TrainingSession {
        TrainingSession(
            id: UUID(),
            modeID: modeID,
            startedAt: startedAt,
            endedAt: endedAt,
            totalAnswers: totalAnswers,
            correctAnswers: correctAnswers
        )
    }

    @Test
    @MainActor
    func emptyDefaultsReturnsNoSessions() {
        let store = SessionStore(defaults: makeDefaults())
        #expect(store.sessions.isEmpty)
    }

    @Test
    @MainActor
    func persistenceRoundTrip() {
        let defaults = makeDefaults()
        let session = makeSession()

        let store1 = SessionStore(defaults: defaults)
        store1.append(session)

        let store2 = SessionStore(defaults: defaults)
        #expect(store2.sessions.count == 1)
        #expect(store2.sessions[0].id == session.id)
    }

    @Test
    @MainActor
    func sessionsReturnedInDescendingOrder() {
        let defaults = makeDefaults()
        let older = makeSession(startedAt: Date(timeIntervalSince1970: 1000))
        let newer = makeSession(startedAt: Date(timeIntervalSince1970: 5000))

        let store = SessionStore(defaults: defaults)
        store.append(older)
        store.append(newer)

        let reloaded = SessionStore(defaults: defaults)
        #expect(reloaded.sessions[0].startedAt > reloaded.sessions[1].startedAt)
    }

    @Test
    @MainActor
    func statsComputesCorrectly() {
        let store = SessionStore(defaults: makeDefaults())
        store.append(makeSession(totalAnswers: 10, correctAnswers: 8))
        store.append(makeSession(totalAnswers: 10, correctAnswers: 6))

        let stats = store.stats()
        #expect(stats.sessions == 2)
        #expect(stats.totalAnswers == 20)
        #expect(stats.accuracy == 70)
    }

    @Test
    @MainActor
    func filteringByModeID() {
        let store = SessionStore(defaults: makeDefaults())
        store.append(makeSession(modeID: .noteReading))
        store.append(makeSession(modeID: .noteReading))

        let noteReadingSessions = store.sessions(for: .noteReading)
        #expect(noteReadingSessions.count == 2)

        let allSessions = store.sessions(for: nil)
        #expect(allSessions.count == 2)
    }
}
```

- [ ] **Step 2: Run tests to verify they compile but don't appear yet**

The file exists on disk but isn't in the Xcode project yet. This is expected — Task 3 will regenerate the project.

- [ ] **Step 3: Commit**

```bash
git add NoteTrainerTests/SessionStoreTests.swift
git commit -m "test: add SessionStore persistence tests"
```

---

### Task 2: MusicTheory Tests

**Files:**
- Create: `NoteTrainerTests/MusicTheoryTests.swift`

**Context:** `Pitch` (`NoteTrainer/Shared/Domain/MusicTheory.swift`) has `semitoneOffsetFromA4` (Int) computed from a letter→semitone lookup table + accidental offset + octave. `frequency` is `440 * pow(2, Double(semitoneOffsetFromA4) / 12)`. `noteReadingRange` is a static array of 17 natural pitches from G3 to B5.

- [ ] **Step 1: Write all MusicTheory tests**

Create `NoteTrainerTests/MusicTheoryTests.swift`:

```swift
import Testing
@testable import NoteTrainer

struct MusicTheoryTests {
    @Test
    func semitoneOffsetsMatchKnownValues() {
        let a4 = Pitch(letter: .a, accidental: .natural, octave: 4)
        #expect(a4.semitoneOffsetFromA4 == 0)

        let c4 = Pitch(letter: .c, accidental: .natural, octave: 4)
        #expect(c4.semitoneOffsetFromA4 == -9)

        let b5 = Pitch(letter: .b, accidental: .natural, octave: 5)
        #expect(b5.semitoneOffsetFromA4 == 14)

        let g3 = Pitch(letter: .g, accidental: .natural, octave: 3)
        #expect(g3.semitoneOffsetFromA4 == -14)
    }

    @Test
    func frequencyMatchesConcertPitch() {
        let a4 = Pitch(letter: .a, accidental: .natural, octave: 4)
        #expect(a4.frequency == 440.0)

        let c4 = Pitch(letter: .c, accidental: .natural, octave: 4)
        #expect(abs(c4.frequency - 261.63) < 0.01)

        let a3 = Pitch(letter: .a, accidental: .natural, octave: 3)
        #expect(abs(a3.frequency - 220.0) < 0.01)
    }

    @Test
    func accidentalOffsetsApplyCorrectly() {
        let cNatural = Pitch(letter: .c, accidental: .natural, octave: 4)
        let cSharp = Pitch(letter: .c, accidental: .sharp, octave: 4)
        let cFlat = Pitch(letter: .c, accidental: .flat, octave: 4)

        #expect(cSharp.semitoneOffsetFromA4 == cNatural.semitoneOffsetFromA4 + 1)
        #expect(cFlat.semitoneOffsetFromA4 == cNatural.semitoneOffsetFromA4 - 1)
    }

    @Test
    func noteReadingRangeIsCorrect() {
        let range = Pitch.noteReadingRange

        #expect(range.count == 17)
        #expect(range.first == Pitch(letter: .g, accidental: .natural, octave: 3))
        #expect(range.last == Pitch(letter: .b, accidental: .natural, octave: 5))
        #expect(range.allSatisfy { $0.accidental == .natural })
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add NoteTrainerTests/MusicTheoryTests.swift
git commit -m "test: add MusicTheory pitch and frequency tests"
```

---

### Task 3: Drop XcodeGen

**Files:**
- Delete: `project.yml`
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Why this task is last:** The new test files from Tasks 1–2 exist on disk but aren't referenced in `NoteTrainer.xcodeproj` yet. Running `xcodegen generate` one final time regenerates the project with all files included (since `project.yml` uses `sources: - path: NoteTrainerTests` which auto-discovers all `.swift` files in the folder). After that, we delete `project.yml` and the `.xcodeproj` becomes the permanent source of truth.

- [ ] **Step 1: Regenerate Xcode project one final time**

```bash
cd /Users/zero_skill/coding/note-trainer && xcodegen generate
```

Expected: `⚙️  Generating plists...` / `Created project at ...`

- [ ] **Step 2: Verify all tests pass with the regenerated project**

```bash
xcodebuild -scheme NoteTrainerTests -destination 'platform=iOS Simulator,name=iPhone 16' test 2>&1 | tail -10
```

Expected: `** TEST SUCCEEDED **` — all 12 tests pass (3 engine + 5 SessionStore + 4 MusicTheory).

- [ ] **Step 3: Delete `project.yml`**

```bash
rm project.yml
```

- [ ] **Step 4: Update `README.md`**

Replace the Development section with:

```markdown
## Development

1. Open `NoteTrainer.xcodeproj`
2. Build the `NoteTrainer` scheme
```

- [ ] **Step 5: Update `CLAUDE.md` — remove XcodeGen from Build & Development**

Replace the Build & Development section with:

````markdown
## Build & Development

```bash
# Build from command line
xcodebuild -scheme NoteTrainer -destination 'platform=iOS Simulator,name=iPhone 16' build

# Run unit tests (Swift Testing framework)
xcodebuild -scheme NoteTrainerTests -destination 'platform=iOS Simulator,name=iPhone 16' test

# Run UI tests (XCTest framework)
xcodebuild -scheme NoteTrainerUITests -destination 'platform=iOS Simulator,name=iPhone 16' test
```

- **Deployment target:** iOS 17.0
- **Swift version:** 5.0
- **Zero external dependencies** — only Apple frameworks (SwiftUI, AVFAudio, Combine, Foundation)
````

- [ ] **Step 6: Verify build still works without `project.yml`**

```bash
xcodebuild -scheme NoteTrainer -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```

Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 7: Commit**

```bash
git add project.yml README.md CLAUDE.md NoteTrainer.xcodeproj/
git commit -m "chore: drop XcodeGen, use native xcodeproj directly"
```
