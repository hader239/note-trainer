import SwiftUI

struct TrainingModeDescriptor: Identifiable {
  let id: TrainingModeID
  let symbolName: String
  let accent: LinearGradient

  var titleKey: LocalizedStringKey { id.titleKey }
  var subtitleKey: LocalizedStringKey { id.subtitleKey }
}
