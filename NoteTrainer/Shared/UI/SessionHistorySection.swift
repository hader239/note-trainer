import SwiftUI

struct SessionHistorySection: View {
  let sessions: [TrainingSession]

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text("history.title")
        .font(.headline)

      if sessions.isEmpty {
        VStack(spacing: 10) {
          Image(systemName: "music.quarternote.3")
            .font(.title2)
            .foregroundStyle(.secondary)

          Text("history.empty")
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
      } else {
        VStack(spacing: 12) {
          ForEach(sessions.prefix(8)) { session in
            SessionHistoryRow(session: session)
          }
        }
      }
    }
  }
}

private struct SessionHistoryRow: View {
  let session: TrainingSession

  var body: some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 4) {
        Text(session.modeID.titleKey)
          .font(.subheadline.weight(.semibold))

        Text(session.startedAt, format: .dateTime.day().month(.abbreviated).hour().minute())
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 4) {
        Text("\(session.correctAnswers)/\(session.totalAnswers)")
          .font(.subheadline.weight(.semibold))

        Text("\(session.accuracy)%")
          .font(.caption.weight(.medium))
          .foregroundStyle(session.accuracy >= 80 ? .green : session.accuracy >= 50 ? .yellow : .red)
      }
    }
    .padding(14)
    .background(.white.opacity(0.04))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
  }
}
