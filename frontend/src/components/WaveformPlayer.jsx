import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { AudioWaveIcon } from './Icons';

export default function WaveformPlayer({ file, audioUrl, title = 'Audio Recording' }) {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || (!file && !audioUrl)) return;

    if (waveSurferRef.current) {
      try {
        waveSurferRef.current.destroy();
      } catch {
        // ignore
      }
      waveSurferRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#CFE8E4', // breath-sky
      progressColor: '#2F8F80', // breath-teal
      cursorColor: '#247367',
      cursorWidth: 1.5,
      height: 44,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
    });

    let srcUrl = audioUrl;
    let objectUrl = null;
    if (file) {
      objectUrl = URL.createObjectURL(file);
      srcUrl = objectUrl;
    }

    if (srcUrl) {
      ws.load(srcUrl).catch((err) => {
        if (err?.name !== 'AbortError') {
          console.warn('WaveSurfer load notice:', err);
        }
      });
    }

    ws.on('ready', () => setTotalDuration(ws.getDuration()));
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    waveSurferRef.current = ws;

    return () => {
      try {
        ws.destroy();
      } catch {
        // ignore
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, audioUrl]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-soft space-y-2.5">
      <div className="flex items-center justify-between text-xs text-ink-secondary">
        <div className="flex items-center gap-1.5 font-medium truncate max-w-[200px]">
          <AudioWaveIcon className="w-4 h-4 text-breath-teal shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <div className="text-xs text-ink-muted">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      <div ref={containerRef} className="cursor-pointer bg-canvas rounded-xl p-1.5 border border-slate-100" />

      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-breath-teal hover:bg-breath-teal-dark text-white font-medium text-xs shadow-xs transition active:scale-95"
        >
          <span>{isPlaying ? 'Pause' : 'Play audio'}</span>
        </button>

        <span className="text-[11px] text-ink-muted">Tap wave to seek</span>
      </div>
    </div>
  );
}

