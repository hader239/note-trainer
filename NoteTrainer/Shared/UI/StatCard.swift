import SwiftUI

struct StatCard: View {
  let value: String
  let titleKey: LocalizedStringKey

  var body: some View {
    VStack(spacing: 6) {
      Text(value)
        .font(.system(size: 28, weight: .bold, design: .rounded))
        .foregroundStyle(
          LinearGradient(colors: [.cyan, .blue], startPoint: .topLeading, endPoint: .bottomTrailing)
        )

      Text(titleKey)
        .font(.caption.weight(.medium))
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 18)
    .padding(.horizontal, 12)
    .background(.white.opacity(0.06))
    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .stroke(.white.opacity(0.08), lineWidth: 1)
    )
  }
}
