import SwiftUI

struct PrimaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.headline)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 16)
      .background(
        LinearGradient(
          colors: [Color.cyan, Color.blue],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      )
      .foregroundStyle(Color.black.opacity(0.85))
      .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
      .scaleEffect(configuration.isPressed ? 0.98 : 1)
      .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
  }
}
