import Foundation

enum AppLaunchConfiguration {
  static var initialPath: [AppRoute] {
    let arguments = ProcessInfo.processInfo.arguments

    if arguments.contains("--open-note-reading") {
      return [.mode(.noteReading)]
    }

    if arguments.contains("--open-settings") {
      return [.settings]
    }

    return []
  }
}
