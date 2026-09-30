// Utility to encode raw AudioBuffer / Float32Array PCM data into a valid 16-bit PCM WAV Blob / File
// Includes digital auto-gain normalization for clear real-time microphone capture

export function normalizeAudioSamples(samples, targetPeak = 0.92) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const absVal = Math.abs(samples[i]);
    if (absVal > peak) peak = absVal;
  }
  if (peak < 1e-4) return samples;
  const gain = Math.min(20.0, targetPeak / peak);
  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    normalized[i] = Math.max(-1.0, Math.min(1.0, samples[i] * gain));
  }
  return normalized;
}

export function encodeWAV(samples, sampleRate = 22050, autoGain = true) {
  const processedSamples = autoGain ? normalizeAudioSamples(samples) : samples;
  const buffer = new ArrayBuffer(44 + processedSamples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + processedSamples.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, processedSamples.length * 2, true);

  // Write the PCM samples
  floatTo16BitPCM(view, 44, processedSamples);

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

// Convert AudioBuffer to mono Float32Array resampled if needed
export function audioBufferToWavFile(audioBuffer, filename = 'breathing_recording.wav', autoGain = true) {
  const channelData = audioBuffer.getChannelData(0);
  const wavBlob = encodeWAV(channelData, audioBuffer.sampleRate, autoGain);
  return new File([wavBlob], filename, { type: 'audio/wav' });
}
