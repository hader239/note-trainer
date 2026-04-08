import SwiftUI

struct HomeView: View {
  let modeRegistry: TrainingModeRegistry
  let onSelectMode: (TrainingModeID) -> Void
  let onOpenSettings: () -> Void

  @EnvironmentObject private var sessionStore: SessionStore

  var body: some View {
    let stats = sessionStore.stats()

    VStack(spacing: 0) {
      HStack {
        VStack(alignment: .leading, spacing: 3) {
          Text("home.title")
            .font(.title2.weight(.bold))
          Text("home.subtitle")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        Spacer()
        Button(action: onOpenSettings) {
          Image(systemName: "slider.horizontal.3")
        }
        .accessibilityLabel(Text("settings.title"))
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 12)

      ScrollView {
        VStack(alignment: .leading, spacing: 24) {
          header

          HStack(spacing: 12) {
            StatCard(value: "\(stats.sessions)", titleKey: "stats.sessions")
            StatCard(value: "\(stats.totalAnswers)", titleKey: "stats.answers")
            StatCard(value: stats.accuracy.map { "\($0)%" } ?? "—", titleKey: "stats.accuracy")
          }

          VStack(alignment: .leading, spacing: 16) {
            Text("home.modes")
              .font(.headline)

            ForEach(modeRegistry.modes) { mode in
              Button {
                onSelectMode(mode.id)
              } label: {
                ModeCard(mode: mode, stats: sessionStore.stats(for: mode.id))
              }
              .buttonStyle(.plain)
            }
          }

          SessionHistorySection(sessions: sessionStore.sessions)
        }
        .padding(20)
      }
    }
    .background(
      LinearGradient(
        colors: [Color(red: 0.05, green: 0.06, blue: 0.13), Color(red: 0.04, green: 0.08, blue: 0.16)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      .ignoresSafeArea()
    )
    .toolbar(.hidden, for: .navigationBar)
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("home.heroTitle")
        .font(.system(size: 34, weight: .bold, design: .rounded))

      Text("home.heroBody")
        .foregroundStyle(.secondary)
    }
    .padding(22)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.white.opacity(0.06))
    .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 26, style: .continuous)
        .stroke(.white.opacity(0.08), lineWidth: 1)
    )
  }
}

private struct ModeCard: View {
  let mode: TrainingModeDescriptor
  let stats: SessionStats

  var body: some View {
    HStack(spacing: 16) {
      ZStack {
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .fill(mode.accent)
        Image(systemName: mode.symbolName)
          .font(.title2.weight(.semibold))
          .foregroundStyle(.black.opacity(0.8))
      }
      .frame(width: 58, height: 58)

      VStack(alignment: .leading, spacing: 6) {
        Text(mode.titleKey)
          .font(.headline)
          .foregroundStyle(.primary)

        Text(mode.subtitleKey)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 4) {
        Text("\(stats.accuracy ?? 0)%")
          .font(.subheadline.weight(.semibold))
        Text("home.modeAccuracy")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(18)
    .background(.white.opacity(0.05))
    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 22, style: .continuous)
        .stroke(.white.opacity(0.08), lineWidth: 1)
    )
  }
}
