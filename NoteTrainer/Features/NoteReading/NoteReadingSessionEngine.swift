import Foundation
import Combine

enum NoteReadingFeedback: Equatable {
  case correct(Pitch)
  case incorrect(correct: Pitch, chosen: NoteLetter)
}

@MainActor
final class NoteReadingSessionEngine: ObservableObject {
  struct DraftSession {
    let startedAt: Date
    var totalAnswers: Int = 0
    var correctAnswers: Int = 0
  }

  @Published var currentPitch: Pitch
  @Published var streak: Int = 0
  @Published var feedback: NoteReadingFeedback?
  @Published var selectedAnswer: NoteLetter?

  private(set) var draftSession: DraftSession
  private var previousPitch: Pitch?
  private var hasFinished = false
  private let notePicker: (_ available: [Pitch], _ previous: Pitch?) -> Pitch

  init(
    startingDate: Date = .now,
    notePicker: @escaping (_ available: [Pitch], _ previous: Pitch?) -> Pitch = NoteReadingSessionEngine.defaultNotePicker
  ) {
    self.draftSession = DraftSession(startedAt: startingDate)
    self.notePicker = notePicker
    self.currentPitch = notePicker(Pitch.noteReadingRange, nil)
    self.previousPitch = currentPitch
  }

  var hasAnsweredCurrentRound: Bool {
    feedback != nil
  }

  func submit(answer: NoteLetter) {
    guard feedback == nil else { return }

    selectedAnswer = answer
    draftSession.totalAnswers += 1

    if answer == currentPitch.letter {
      streak += 1
      draftSession.correctAnswers += 1
      feedback = .correct(currentPitch)
    } else {
      streak = 0
      feedback = .incorrect(correct: currentPitch, chosen: answer)
    }
  }

  func nextRound() {
    previousPitch = currentPitch
    currentPitch = notePicker(Pitch.noteReadingRange, previousPitch)
    selectedAnswer = nil
    feedback = nil
  }

  func finishSession(modeID: TrainingModeID = .noteReading, endedAt: Date = .now) -> TrainingSession? {
    guard !hasFinished else { return nil }
    hasFinished = true

    guard draftSession.totalAnswers > 0 else { return nil }

    return TrainingSession(
      id: UUID(),
      modeID: modeID,
      startedAt: draftSession.startedAt,
      endedAt: endedAt,
      totalAnswers: draftSession.totalAnswers,
      correctAnswers: draftSession.correctAnswers
    )
  }

  nonisolated static func defaultNotePicker(available: [Pitch], previous: Pitch?) -> Pitch {
    let filtered = available.filter { $0 != previous }
    return filtered.randomElement() ?? available[0]
  }
}
