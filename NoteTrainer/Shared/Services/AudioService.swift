import AVFAudio
import Combine
import Foundation

@MainActor
final class AudioService: ObservableObject {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private var violinSampler: AVAudioUnitSampler?
  private var configured = false
  private var activeNoteTask: Task<Void, Never>?

  func play(pitch: Pitch, settings: AudioSettings) {
    configureIfNeeded()
    activeNoteTask?.cancel()

    switch settings.instrument {
    case .piano:
      playPianoSynthesis(pitch: pitch, settings: settings)
    case .violin:
      if violinSampler != nil {
        playSamplerNote(pitch: pitch, settings: settings)
      } else {
        playPianoSynthesis(pitch: pitch, settings: settings)
      }
    }
  }

  // MARK: - Sampler playback (violin via SoundFont)

  private func playSamplerNote(pitch: Pitch, settings: AudioSettings) {
    guard let sampler = violinSampler else { return }

    sampler.startNote(pitch.midiNote, withVelocity: 100, onChannel: 0)

    activeNoteTask = Task {
      try? await Task.sleep(for: .milliseconds(Int(settings.duration * 1000)))
      guard !Task.isCancelled else { return }
      sampler.stopNote(pitch.midiNote, onChannel: 0)
    }
  }

  // MARK: - Piano synthesis (buffer-based)

  private func playPianoSynthesis(pitch: Pitch, settings: AudioSettings) {
    player.stop()

    let sampleRate: Double = 44_100
    let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!
    let frameCount = AVAudioFrameCount(sampleRate * settings.duration)
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }

    buffer.frameLength = frameCount
    let frequency = pitch.frequency

    if let channel = buffer.floatChannelData?[0] {
      let harmonics: [(partial: Double, amplitude: Double)] = [
        (1, 1.0), (2, 0.5), (3, 0.18), (4, 0.12), (5, 0.06), (6, 0.04)
      ]
      let attack: Double = 0.005
      let decayRate: Double = 3.5

      for frame in 0 ..< Int(frameCount) {
        let time = Double(frame) / sampleRate
        let env = (time < attack ? time / attack : 1.0) * exp(-decayRate * time)

        var sample: Double = 0
        for h in harmonics {
          let freq = frequency * h.partial
          guard freq < sampleRate / 2 else { continue }
          sample += sin(2 * .pi * freq * time) * h.amplitude
        }
        channel[frame] = Float(sample * env * 0.25)
      }
    }

    player.scheduleBuffer(buffer, at: nil, options: .interrupts)
    player.play()
  }

  // MARK: - Engine setup

  private func configureIfNeeded() {
    guard !configured else { return }

    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)

      engine.attach(player)
      engine.connect(player, to: engine.mainMixerNode, format: AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1))

      loadViolinSampler()

      try engine.start()
      configured = true
    } catch {
      assertionFailure("Audio engine failed to start: \(error)")
    }
  }

  private func loadViolinSampler() {
    guard let url = Bundle.main.url(forResource: "violin", withExtension: "sf2") else {
      print("[AudioService] violin.sf2 not found in bundle — violin will use piano fallback")
      return
    }

    let sampler = AVAudioUnitSampler()
    engine.attach(sampler)
    engine.connect(sampler, to: engine.mainMixerNode, format: nil)

    do {
      try sampler.loadSoundBankInstrument(
        at: url,
        program: 0,
        bankMSB: UInt8(kAUSampler_DefaultMelodicBankMSB),
        bankLSB: UInt8(kAUSampler_DefaultBankLSB)
      )
      violinSampler = sampler
      print("[AudioService] violin.sf2 loaded successfully")
    } catch {
      print("[AudioService] Failed to load violin.sf2: \(error)")
      engine.detach(sampler)
    }
  }
}
