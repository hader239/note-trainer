import Foundation

struct TrainingSession: Identifiable, Codable, Hashable {
  let id: UUID
  let modeID: TrainingModeID
  let startedAt: Date
  let endedAt: Date
  let totalAnswers: Int
  let correctAnswers: Int

  var accuracy: Int {
    guard totalAnswers > 0 else { return 0 }
    return Int((Double(correctAnswers) / Double(totalAnswers) * 100).rounded())
  }
}

struct SessionStats {
  let sessions: Int
  let totalAnswers: Int
  let accuracy: Int?
}
