import SwiftUI

struct StaffView: View {
  let pitch: Pitch

  var body: some View {
    GeometryReader { geometry in
      Canvas { context, size in
        let lineSpacing = size.height / 10
        let centerY = size.height / 2
        let bottomLineY = centerY + 2 * lineSpacing
        let startX: CGFloat = 36
        let endX = size.width - 20

        for index in 0 ..< 5 {
          let y = bottomLineY - CGFloat(index) * lineSpacing
          var path = Path()
          path.move(to: CGPoint(x: startX, y: y))
          path.addLine(to: CGPoint(x: endX, y: y))
          context.stroke(path, with: .color(.white.opacity(0.28)), lineWidth: 1.5)
        }

        let treble = Text("𝄞")
          .font(.system(size: lineSpacing * 5.2))
          .foregroundStyle(.white.opacity(0.38))
        context.draw(treble, at: CGPoint(x: 56, y: centerY + lineSpacing * 0.15))

        let pos = notePosition(for: pitch)
        let noteX = size.width * 0.6
        let noteY = bottomLineY - CGFloat(pos) * (lineSpacing / 2)
        let noteSize = CGSize(width: lineSpacing * 1.2, height: lineSpacing * 0.85)

        drawLedgerLines(context: &context, pos: pos, noteX: noteX, bottomLineY: bottomLineY, lineSpacing: lineSpacing, halfWidth: lineSpacing * 0.9)

        let notePath = Path(ellipseIn: CGRect(
          x: noteX - noteSize.width / 2,
          y: noteY - noteSize.height / 2,
          width: noteSize.width,
          height: noteSize.height
        ))
        context.fill(notePath, with: .color(.cyan))
        context.addFilter(.shadow(color: .cyan.opacity(0.4), radius: 8))
        context.fill(notePath, with: .color(.cyan))

        let stemUp = pos < 4
        var stem = Path()
        if stemUp {
          stem.move(to: CGPoint(x: noteX + noteSize.width * 0.45, y: noteY))
          stem.addLine(to: CGPoint(x: noteX + noteSize.width * 0.45, y: noteY - lineSpacing * 3))
        } else {
          stem.move(to: CGPoint(x: noteX - noteSize.width * 0.45, y: noteY))
          stem.addLine(to: CGPoint(x: noteX - noteSize.width * 0.45, y: noteY + lineSpacing * 3))
        }
        context.stroke(stem, with: .color(.cyan), lineWidth: 2)
      }
    }
    .frame(maxWidth: .infinity)
    .aspectRatio(360 / 280, contentMode: .fit)
    .padding(16)
    .background(.white.opacity(0.05))
    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 24, style: .continuous)
        .stroke(.white.opacity(0.08), lineWidth: 1)
    )
  }

  private func notePosition(for pitch: Pitch) -> Int {
    let degreeByLetter: [NoteLetter: Int] = [
      .c: 0,
      .d: 1,
      .e: 2,
      .f: 3,
      .g: 4,
      .a: 5,
      .b: 6
    ]
    return (pitch.octave - 4) * 7 + (degreeByLetter[pitch.letter] ?? 0) - 2
  }

  private func drawLedgerLines(
    context: inout GraphicsContext,
    pos: Int,
    noteX: CGFloat,
    bottomLineY: CGFloat,
    lineSpacing: CGFloat,
    halfWidth: CGFloat
  ) {
    if pos < 0 {
      for ledger in stride(from: -2, through: pos, by: -2) {
        let y = bottomLineY - CGFloat(ledger) * (lineSpacing / 2)
        var path = Path()
        path.move(to: CGPoint(x: noteX - halfWidth, y: y))
        path.addLine(to: CGPoint(x: noteX + halfWidth, y: y))
        context.stroke(path, with: .color(.white.opacity(0.3)), lineWidth: 1.5)
      }
    }

    if pos > 8 {
      for ledger in stride(from: 10, through: pos, by: 2) {
        let y = bottomLineY - CGFloat(ledger) * (lineSpacing / 2)
        var path = Path()
        path.move(to: CGPoint(x: noteX - halfWidth, y: y))
        path.addLine(to: CGPoint(x: noteX + halfWidth, y: y))
        context.stroke(path, with: .color(.white.opacity(0.3)), lineWidth: 1.5)
      }
    }
  }
}
