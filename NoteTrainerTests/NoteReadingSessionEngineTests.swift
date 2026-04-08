import Testing
@testable import NoteTrainer

struct NoteReadingSessionEngineTests {
  @Test
  @MainActor
  func correctAnswerIncrementsStreakAndCorrectCount() {
    let pitch = Pitch(letter: .a, accidental: .natural, octave: 4)
    let engine = NoteReadingSessionEngine(notePicker: { _, _ in pitch })

    engine.submit(answer: .a)

    #expect(engine.streak == 1)
    #expect(engine.draftSession.totalAnswers == 1)
    #expect(engine.draftSession.correctAnswers == 1)
  }

  @Test
  @MainActor
  func incorrectAnswerResetsStreakAndReturnsCompletedSession() {
    let pitch = Pitch(letter: .c, accidental: .natural, octave: 5)
    let engine = NoteReadingSessionEngine(notePicker: { _, _ in pitch })

    engine.submit(answer: .d)
    let session = engine.finishSession()

    #expect(engine.streak == 0)
    #expect(session?.totalAnswers == 1)
    #expect(session?.correctAnswers == 0)
    #expect(session?.modeID == .noteReading)
  }

  @Test
  @MainActor
  func nextRoundClearsFeedbackAndSelection() {
    let firstPitch = Pitch(letter: .g, accidental: .natural, octave: 4)
    let secondPitch = Pitch(letter: .a, accidental: .natural, octave: 4)
    var picks = [firstPitch, secondPitch]
    let engine = NoteReadingSessionEngine(notePicker: { _, _ in
      picks.removeFirst()
    })

    engine.submit(answer: .f)
    engine.nextRound()

    #expect(engine.feedback == nil)
    #expect(engine.selectedAnswer == nil)
    #expect(engine.currentPitch == secondPitch)
  }
}
