import Foundation
import Combine

@MainActor
final class SessionStore: ObservableObject {
  private enum Keys {
    static let sessions = "noteTrainer.sessions"
  }

  @Published private(set) var sessions: [TrainingSession]

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults

    if
      let data = defaults.data(forKey: Keys.sessions),
      let decoded = try? JSONDecoder().decode([TrainingSession].self, from: data)
    {
      self.sessions = decoded.sorted(by: { $0.startedAt > $1.startedAt })
    } else {
      self.sessions = []
    }
  }

  private let defaults: UserDefaults

  private static let maxSessions = 10

  func append(_ session: TrainingSession) {
    sessions.insert(session, at: 0)
    if sessions.count > Self.maxSessions {
      sessions = Array(sessions.prefix(Self.maxSessions))
    }
    save()
  }

  func sessions(for modeID: TrainingModeID?) -> [TrainingSession] {
    guard let modeID else { return sessions }
    return sessions.filter { $0.modeID == modeID }
  }

  func stats(for modeID: TrainingModeID? = nil) -> SessionStats {
    let scopedSessions = sessions(for: modeID)
    let totalAnswers = scopedSessions.reduce(0) { $0 + $1.totalAnswers }
    let totalCorrect = scopedSessions.reduce(0) { $0 + $1.correctAnswers }
    let accuracy = totalAnswers > 0 ? Int((Double(totalCorrect) / Double(totalAnswers) * 100).rounded()) : nil
    return SessionStats(sessions: scopedSessions.count, totalAnswers: totalAnswers, accuracy: accuracy)
  }

  private func save() {
    guard let data = try? JSONEncoder().encode(sessions) else { return }
    defaults.set(data, forKey: Keys.sessions)
  }
}
