import SwiftUI

struct SettingsView: View {
  @EnvironmentObject private var settingsStore: SettingsStore

  var body: some View {
    Form {
      Section("settings.audio") {
        Picker("settings.instrument", selection: $settingsStore.audioSettings.instrument) {
          ForEach(Instrument.allCases, id: \.self) { instrument in
            Text(instrument.localizedName)
              .tag(instrument)
          }
        }

        VStack(alignment: .leading, spacing: 8) {
          HStack {
            Text("settings.duration")
            Spacer()
            Text("\(settingsStore.audioSettings.duration.formatted(.number.precision(.fractionLength(1))))s")
              .foregroundStyle(.secondary)
          }
          Slider(
            value: Binding(
              get: { settingsStore.audioSettings.duration },
              set: { settingsStore.audioSettings.duration = $0 }
            ),
            in: 0.4 ... 2.5
          )
          .accessibilityLabel(Text("settings.duration"))
        }
      }

      Section("settings.language") {
        Picker("settings.language", selection: $settingsStore.language) {
          ForEach(AppLanguage.allCases) { language in
            Text(language.localizedName)
              .tag(language)
          }
        }

        Text("settings.languageRestart")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
    .scrollContentBackground(.hidden)
    .background(Color(red: 0.05, green: 0.06, blue: 0.13).ignoresSafeArea())
    .navigationTitle("settings.title")
  }
}
