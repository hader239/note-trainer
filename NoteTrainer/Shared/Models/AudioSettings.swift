import Foundation

import SwiftUI

enum Instrument: String, Codable, CaseIterable, Hashable {
  case piano
  case violin

  var localizedName: LocalizedStringKey {
    switch self {
    case .piano: "settings.instrument.piano"
    case .violin: "settings.instrument.violin"
    }
  }
}

struct AudioSettings: Codable, Hashable {
  var instrument: Instrument = .piano
  var duration: Double = 1.5
}
