import SwiftUI

struct AppView: View {
  let modeRegistry: TrainingModeRegistry

  @State private var path: [AppRoute]

  init(modeRegistry: TrainingModeRegistry) {
    self.modeRegistry = modeRegistry
    self._path = State(initialValue: AppLaunchConfiguration.initialPath)
  }

  var body: some View {
    NavigationStack(path: $path) {
      HomeView(
        modeRegistry: modeRegistry,
        onSelectMode: navigateToMode,
        onOpenSettings: openSettings
      )
      .navigationDestination(for: AppRoute.self) { route in
        switch route {
        case .mode(let modeID):
          destination(for: modeID)
        case .settings:
          SettingsView()
        }
      }
    }
    .tint(.cyan)
  }

  @ViewBuilder
  private func destination(for modeID: TrainingModeID) -> some View {
    switch modeID {
    case .noteReading:
      NoteReadingView(onClose: closeCurrentRoute)
    }
  }

  private func navigateToMode(_ modeID: TrainingModeID) {
    path.append(.mode(modeID))
  }

  private func openSettings() {
    path.append(.settings)
  }

  private func closeCurrentRoute() {
    guard !path.isEmpty else { return }
    path.removeLast()
  }
}
