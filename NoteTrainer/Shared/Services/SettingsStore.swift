import Foundation
import Combine

@MainActor
final class SettingsStore: ObservableObject {
  private enum Keys {
    static let audioSettings = "noteTrainer.audioSettings"
  }

  @Published var audioSettings: AudioSettings {
    didSet { save() }
  }

  @Published var language: AppLanguage {
    didSet { saveLanguage() }
  }

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults

    if
      let data = defaults.data(forKey: Keys.audioSettings),
      let decoded = try? JSONDecoder().decode(AudioSettings.self, from: data)
    {
      self.audioSettings = decoded
    } else {
      self.audioSettings = AudioSettings()
    }

    self.language = AppLanguage.current(from: defaults)
  }

  private let defaults: UserDefaults

  private func save() {
    guard let data = try? JSONEncoder().encode(audioSettings) else { return }
    defaults.set(data, forKey: Keys.audioSettings)
  }

  private func saveLanguage() {
    defaults.set([language.rawValue], forKey: "AppleLanguages")
  }
}
