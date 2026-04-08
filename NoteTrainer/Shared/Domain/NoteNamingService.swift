import Foundation

struct NoteNamingService {
  func localizedButtonName(for letter: NoteLetter, locale: Locale = .autoupdatingCurrent) -> String {
    if languageCode(for: locale) == "ru" {
      switch letter {
      case .c: return "До"
      case .d: return "Ре"
      case .e: return "Ми"
      case .f: return "Фа"
      case .g: return "Соль"
      case .a: return "Ля"
      case .b: return "Си"
      }
    }

    return letter.rawValue.uppercased()
  }

  func localizedPitchName(for pitch: Pitch, locale: Locale = .autoupdatingCurrent) -> String {
    "\(localizedButtonName(for: pitch.letter, locale: locale))\(pitch.octave)"
  }

  private func languageCode(for locale: Locale) -> String {
    locale.language.languageCode?.identifier ?? locale.identifier
  }
}
