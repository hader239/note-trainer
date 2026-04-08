import SwiftUI

enum TrainingModeID: String, Codable, CaseIterable, Identifiable, Hashable {
  case noteReading

  var id: String { rawValue }

  var titleKey: LocalizedStringKey {
    switch self {
    case .noteReading:
      "mode.noteReading.title"
    }
  }

  var subtitleKey: LocalizedStringKey {
    switch self {
    case .noteReading:
      "mode.noteReading.subtitle"
    }
  }

  var symbolName: String {
    switch self {
    case .noteReading:
      "music.note"
    }
  }
}
