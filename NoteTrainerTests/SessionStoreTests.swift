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
