import Foundation

enum NoteLetter: String, Codable, CaseIterable, Identifiable, Hashable {
  case c
  case d
  case e
  case f
  case g
  case a
  case b

  var id: String { rawValue }
}

enum Accidental: String, Codable, Hashable {
  case natural
  case sharp
  case flat
}

struct Pitch: Codable, Hashable, Identifiable {
  let letter: NoteLetter
  let accidental: Accidental
  let octave: Int

  var id: String {
    "\(letter.rawValue)-\(accidental.rawValue)-\(octave)"
  }

  var semitoneOffsetFromA4: Int {
    let semitoneByLetter: [NoteLetter: Int] = [
      .c: -9,
      .d: -7,
      .e: -5,
      .f: -4,
      .g: -2,
      .a: 0,
      .b: 2
    ]
    let accidentalOffset: Int
    switch accidental {
    case .natural:
      accidentalOffset = 0
    case .sharp:
      accidentalOffset = 1
    case .flat:
      accidentalOffset = -1
    }

    return (octave - 4) * 12 + (semitoneByLetter[letter] ?? 0) + accidentalOffset
  }

  var midiNote: UInt8 {
    UInt8(clamping: 69 + semitoneOffsetFromA4)
  }

  var frequency: Double {
    440 * pow(2, Double(semitoneOffsetFromA4) / 12)
  }

  static let noteReadingRange: [Pitch] = [
    Pitch(letter: .g, accidental: .natural, octave: 3),
    Pitch(letter: .a, accidental: .natural, octave: 3),
    Pitch(letter: .b, accidental: .natural, octave: 3),
    Pitch(letter: .c, accidental: .natural, octave: 4),
    Pitch(letter: .d, accidental: .natural, octave: 4),
    Pitch(letter: .e, accidental: .natural, octave: 4),
    Pitch(letter: .f, accidental: .natural, octave: 4),
    Pitch(letter: .g, accidental: .natural, octave: 4),
    Pitch(letter: .a, accidental: .natural, octave: 4),
    Pitch(letter: .b, accidental: .natural, octave: 4),
    Pitch(letter: .c, accidental: .natural, octave: 5),
    Pitch(letter: .d, accidental: .natural, octave: 5),
    Pitch(letter: .e, accidental: .natural, octave: 5),
    Pitch(letter: .f, accidental: .natural, octave: 5),
    Pitch(letter: .g, accidental: .natural, octave: 5),
    Pitch(letter: .a, accidental: .natural, octave: 5),
    Pitch(letter: .b, accidental: .natural, octave: 5)
  ]
}
