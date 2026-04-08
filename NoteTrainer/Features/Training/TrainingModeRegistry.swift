import SwiftUI

struct TrainingModeRegistry {
  let modes: [TrainingModeDescriptor]

  static let `default` = TrainingModeRegistry(
    modes: [
      TrainingModeDescriptor(
        id: .noteReading,
        symbolName: TrainingModeID.noteReading.symbolName,
        accent: LinearGradient(colors: [.cyan, .blue], startPoint: .topLeading, endPoint: .bottomTrailing)
      )
    ]
  )
}
