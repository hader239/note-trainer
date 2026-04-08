import Testing
@testable import NoteTrainer

struct MusicTheoryTests {
    @Test
    func semitoneOffsetsMatchKnownValues() {
        let a4 = Pitch(letter: .a, accidental: .natural, octave: 4)
        #expect(a4.semitoneOffsetFromA4 == 0)

        let c4 = Pitch(letter: .c, accidental: .natural, octave: 4)
        #expect(c4.semitoneOffsetFromA4 == -9)

        let b5 = Pitch(letter: .b, accidental: .natural, octave: 5)
        #expect(b5.semitoneOffsetFromA4 == 14)

        let g3 = Pitch(letter: .g, accidental: .natural, octave: 3)
        #expect(g3.semitoneOffsetFromA4 == -14)
    }

    @Test
    func frequencyMatchesConcertPitch() {
        let a4 = Pitch(letter: .a, accidental: .natural, octave: 4)
        #expect(a4.frequency == 440.0)

        let c4 = Pitch(letter: .c, accidental: .natural, octave: 4)
        #expect(abs(c4.frequency - 261.63) < 0.01)

        let a3 = Pitch(letter: .a, accidental: .natural, octave: 3)
        #expect(abs(a3.frequency - 220.0) < 0.01)
    }

    @Test
    func accidentalOffsetsApplyCorrectly() {
        let cNatural = Pitch(letter: .c, accidental: .natural, octave: 4)
        let cSharp = Pitch(letter: .c, accidental: .sharp, octave: 4)
        let cFlat = Pitch(letter: .c, accidental: .flat, octave: 4)

        #expect(cSharp.semitoneOffsetFromA4 == cNatural.semitoneOffsetFromA4 + 1)
        #expect(cFlat.semitoneOffsetFromA4 == cNatural.semitoneOffsetFromA4 - 1)
    }

    @Test
    func noteReadingRangeIsCorrect() {
        let range = Pitch.noteReadingRange

        #expect(range.count == 17)
        #expect(range.first == Pitch(letter: .g, accidental: .natural, octave: 3))
        #expect(range.last == Pitch(letter: .b, accidental: .natural, octave: 5))
        #expect(range.allSatisfy { $0.accidental == .natural })
    }
}
