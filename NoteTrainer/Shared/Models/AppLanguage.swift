import SwiftUI

enum AppLanguage: String, CaseIterable, Identifiable {
  case english = "en"
  case russian = "ru"

  var id: String { rawValue }

  var localizedName: LocalizedStringKey {
    switch self {
    case .english: "settings.language.english"
    case .russian: "settings.language.russian"
    }
  }

  /// Reads the current language override from UserDefaults, falling back to the system language.
  static func current(from defaults: UserDefaults = .standard) -> AppLanguage {
    guard
      let languages = defaults.array(forKey: "AppleLanguages") as? [String],
      let first = languages.first,
      let match = AppLanguage(rawValue: String(first.prefix(2)))
    else {
      return .english
    }
    return match
  }
}
