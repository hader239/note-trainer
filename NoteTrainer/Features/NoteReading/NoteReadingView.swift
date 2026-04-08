import SwiftUI

struct NoteReadingView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @EnvironmentObject private var settingsStore: SettingsStore
  @EnvironmentObject private var audioService: AudioService

  @StateObject private var engine = NoteReadingSessionEngine()
  @State private var pendingAdvanceTask: Task<Void, Never>?

  let onClose: () -> Void

  private let naming = NoteNamingService()
  private let feedbackSectionID = "note-reading-feedback"

  var body: some View {
    ScrollViewReader { proxy in
      ScrollView {
        VStack(spacing: 20) {
          header

          StaffView(pitch: engine.currentPitch)

          Button {
            audioService.play(pitch: engine.currentPitch, settings: settingsStore.audioSettings)
          } label: {
            Label("noteReading.playReference", systemImage: "speaker.wave.2.fill")
              .frame(maxWidth: .infinity)
          }
          .buttonStyle(PrimaryButtonStyle())

          LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(NoteLetter.allCases) { letter in
              Button {
                engine.submit(answer: letter)
              } label: {
                Text(naming.localizedButtonName(for: letter))
                  .font(.headline)
                  .frame(maxWidth: .infinity, minHeight: 52)
              }
              .buttonStyle(NoteAnswerButtonStyle(state: buttonState(for: letter)))
              .disabled(engine.hasAnsweredCurrentRound)
            }
          }

          if let feedback = engine.feedback {
            feedbackView(feedback)
              .id(feedbackSectionID)
          }
        }
        .padding(20)
      }
      .safeAreaInset(edge: .bottom) {
        if engine.feedback != nil {
          nextRoundBar
        }
      }
      .onChange(of: engine.feedback) { _, feedback in
        handleFeedbackChange(feedback, using: proxy)
      }
      .background(
        LinearGradient(
          colors: [Color(red: 0.05, green: 0.06, blue: 0.13), Color(red: 0.04, green: 0.08, blue: 0.16)],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
      )
    }
    .navigationBarBackButtonHidden()
    .toolbar {
      ToolbarItem(placement: .topBarLeading) {
        Button {
          finishAndDismiss()
        } label: {
          Label("noteReading.end", systemImage: "xmark")
        }
      }

      ToolbarItem(placement: .principal) {
        Text("mode.noteReading.title")
          .font(.headline)
      }

      ToolbarItem(placement: .topBarTrailing) {
        HStack(spacing: 6) {
          Image(systemName: "flame.fill")
            .foregroundStyle(.orange)
          Text("\(engine.streak)")
            .fontWeight(.semibold)
        }
      }
    }
    .onDisappear {
      cancelPendingAdvance()
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("noteReading.instructions")
        .font(.headline)

      Text("noteReading.instructionsBody")
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(.white.opacity(0.06))
    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
  }

  @ViewBuilder
  private func feedbackView(_ feedback: NoteReadingFeedback) -> some View {
    VStack(spacing: 14) {
      switch feedback {
      case .correct(let pitch):
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 40))
          .foregroundStyle(.green)

        Text(verbatim: String(
          format: NSLocalizedString("noteReading.feedback.correct", comment: ""),
          naming.localizedPitchName(for: pitch)
        ))
        .font(.headline)

      case .incorrect(let correct, let chosen):
        Image(systemName: "xmark.circle.fill")
          .font(.system(size: 40))
          .foregroundStyle(.red)

        Text(verbatim: String(
          format: NSLocalizedString("noteReading.feedback.incorrect", comment: ""),
          naming.localizedPitchName(for: correct),
          naming.localizedButtonName(for: chosen)
        ))
        .font(.headline)
        .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity)
    .padding(20)
    .background(.white.opacity(0.06))
    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
  }

  private func buttonState(for letter: NoteLetter) -> NoteAnswerButtonState {
    guard let feedback = engine.feedback else { return .default }

    switch feedback {
    case .correct(let pitch):
      return pitch.letter == letter ? .correct : .disabled

    case .incorrect(let correct, let chosen):
      if chosen == letter {
        return .wrong
      }
      if correct.letter == letter {
        return .revealed
      }
      return .disabled
    }
  }

  private var nextRoundBar: some View {
    VStack(spacing: 0) {
      Divider()
        .overlay(.white.opacity(0.08))

      Button("noteReading.next") {
        advanceToNextRound()
      }
      .buttonStyle(PrimaryButtonStyle())
      .padding(.horizontal, 20)
      .padding(.top, 12)
      .padding(.bottom, 8)
    }
    .background(Color.black.opacity(0.28))
  }

  private func handleFeedbackChange(_ feedback: NoteReadingFeedback?, using proxy: ScrollViewProxy) {
    cancelPendingAdvance()

    guard let feedback else { return }

    withAnimation(.easeInOut(duration: 0.2)) {
      proxy.scrollTo(feedbackSectionID, anchor: .bottom)
    }

    pendingAdvanceTask = Task {
      try? await Task.sleep(for: autoAdvanceDelay(for: feedback))
      guard !Task.isCancelled else { return }
      await MainActor.run {
        advanceToNextRound()
      }
    }
  }

  private func autoAdvanceDelay(for feedback: NoteReadingFeedback) -> Duration {
    switch feedback {
    case .correct:
      return .seconds(1.2)
    case .incorrect:
      return .seconds(1.8)
    }
  }

  private func advanceToNextRound() {
    guard engine.feedback != nil else { return }
    cancelPendingAdvance()
    engine.nextRound()
  }

  private func cancelPendingAdvance() {
    pendingAdvanceTask?.cancel()
    pendingAdvanceTask = nil
  }

  private func finishAndDismiss() {
    cancelPendingAdvance()
    if let session = engine.finishSession() {
      sessionStore.append(session)
    }
    onClose()
  }
}

private enum NoteAnswerButtonState {
  case `default`
  case correct
  case wrong
  case revealed
  case disabled
}

private struct NoteAnswerButtonStyle: ButtonStyle {
  let state: NoteAnswerButtonState

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .padding(.vertical, 14)
      .padding(.horizontal, 10)
      .frame(maxWidth: .infinity)
      .background(backgroundColor.opacity(configuration.isPressed ? 0.9 : 1))
      .foregroundStyle(foregroundColor)
      .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
      .overlay(
        RoundedRectangle(cornerRadius: 16, style: .continuous)
          .stroke(borderColor, lineWidth: 1.2)
      )
      .opacity(state == .disabled ? 0.5 : 1)
      .animation(.easeOut(duration: 0.18), value: stateHash)
  }

  private var backgroundColor: Color {
    switch state {
    case .default, .disabled:
      return .white.opacity(0.06)
    case .correct:
      return .green.opacity(0.9)
    case .wrong:
      return .red.opacity(0.9)
    case .revealed:
      return .cyan.opacity(0.16)
    }
  }

  private var borderColor: Color {
    switch state {
    case .default, .disabled:
      return .white.opacity(0.08)
    case .correct:
      return .green
    case .wrong:
      return .red
    case .revealed:
      return .cyan
    }
  }

  private var foregroundColor: Color {
    switch state {
    case .correct, .wrong:
      return .black.opacity(0.85)
    default:
      return .primary
    }
  }

  private var stateHash: Int {
    switch state {
    case .default: return 0
    case .correct: return 1
    case .wrong: return 2
    case .revealed: return 3
    case .disabled: return 4
    }
  }
}
