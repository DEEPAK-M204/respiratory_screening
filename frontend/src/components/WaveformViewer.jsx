import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

// Renders an audio waveform for a given File object, before it's even
// uploaded — gives the user immediate visual feedback on what they selected.
export default function WaveformViewer({ file }) {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);

  useEffect(() => {
    if (!file || !containerRef.current) return;

    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3B5772',
      progressColor: '#1F9C86',
      height: 80,
      barWidth: 2,
    });

    const objectUrl = URL.createObjectURL(file);
    ws.load(objectUrl);
    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return <div ref={containerRef} className="w-full border rounded-md p-2 bg-white" />;
}