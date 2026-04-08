import SwiftUI

@main
struct NoteTrainerApp: App {
  @StateObject private var sessionStore = SessionStore()
  @StateObject private var settingsStore = SettingsStore()
  @StateObject private var audioService = AudioService()
  private let modeRegistry = TrainingModeRegistry.default

  var body: some Scene {
    WindowGroup {
      AppView(modeRegistry: modeRegistry)
        .environmentObject(sessionStore)
        .environmentObject(settingsStore)
        .environmentObject(audioService)
        .preferredColorScheme(.dark)
    }
  }
}
