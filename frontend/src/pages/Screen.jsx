import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeRecording } from '../api/client';
import { encodeWAV } from '../utils/audioEncoder';
import { 
  MicIcon, 
  AlertCircleIcon, 
  CheckCircleIcon
} from '../components/Icons';

export default function Screen() {
  const navigate = useNavigate();
  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'recording' | 'recorded'
  const [breathPhase, setBreathPhase] = useState('Ready'); // 'Inhale' | 'Hold' | 'Exhale'
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [mode, setMode] = useState('realtime_mic'); // 'realtime_mic' | 'clinical_upload'
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const breathIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  useEffect(() => {
    return () => {
      stopTracks();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startAudioMonitoring = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioContextRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;
      animFrameRef.current = requestAnimationFrame(updateVolume);
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength;
      setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
    };

    updateVolume();
  };

  const startRecording = async () => {
    setError('');
    setFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    audioChunksRef.current = [];
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
          const decodedBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
          const channelData = decodedBuffer.getChannelData(0);
          const wavBlob = encodeWAV(channelData, decodedBuffer.sampleRate, true);
          const wavFile = new File([wavBlob], `breathing_${Date.now()}.wav`, { type: 'audio/wav' });

          const url = URL.createObjectURL(wavBlob);
          setFile(wavFile);
          setAudioUrl(url);
          setRecordingState('recorded');
          decodeCtx.close();
        } catch {
          const fallbackFile = new File([audioBlob], `breathing_${Date.now()}.wav`, { type: audioBlob.type });
          const url = URL.createObjectURL(audioBlob);
          setFile(fallbackFile);
          setAudioUrl(url);
          setRecordingState('recorded');
        }
      };

      mediaRecorder.start(100);
      setRecordingState('recording');
      startAudioMonitoring(stream);

      // Duration Timer
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
      }, 200);

      // 6-Second Breathing Cycle Pacer: Inhale (2.5s) -> Hold (0.7s) -> Exhale (2.8s)
      let cycleTime = 0;
      setBreathPhase('Inhale');
      breathIntervalRef.current = setInterval(() => {
        cycleTime = (cycleTime + 0.1) % 6.0;
        if (cycleTime < 2.5) {
          setBreathPhase('Inhale');
        } else if (cycleTime < 3.2) {
          setBreathPhase('Hold');
        } else {
          setBreathPhase('Exhale');
        }
      }, 100);

    } catch (err) {
      console.error('Microphone error:', err);
      setError('Please allow microphone access to record your breathing.');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopTracks();
    }
  };

  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    const validExtensions = ['.wav', '.mp3'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError('Please choose a .WAV or .MP3 audio recording.');
      return;
    }

    setFile(selectedFile);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(selectedFile));
    setRecordingState('recorded');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please record or choose an audio file first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await analyzeRecording(file, mode);
      navigate('/results', { state: { result, mode } });
    } catch (err) {
      console.error('Analysis error:', err);
      setError(
        err.response?.data?.detail || 
        'Could not complete screening. Please check backend connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setRecordingState('idle');
    setFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    setError('');
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6 md:space-y-8">
      {/* Title & Mode Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="space-y-1 text-left">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-sora text-ink-primary tracking-tight">
            Respiratory Sound Screening
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
            {recordingState === 'recording'
              ? 'Breathe deeply through your mouth into your microphone.'
              : recordingState === 'recorded'
              ? 'Audio sample ready. Review and submit for acoustic screening.'
              : 'Capture a breath sample to evaluate acoustic quality and screening indicators.'}
          </p>
        </div>

        {/* Operating Mode Selector */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('realtime_mic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'realtime_mic'
                ? 'bg-white text-breath-teal shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            🎙️ Live Mic Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('clinical_upload')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'clinical_upload'
                ? 'bg-white text-breath-teal shadow-xs'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            🩺 Clinical Upload
          </button>
        </div>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center md:items-start">
        {/* Left Column: Breathing Circle & Action Area */}
        <div className="md:col-span-7 flex flex-col items-center text-center space-y-5 sm:space-y-6 w-full">
          {/* Hero Interactive Breathing Circle */}
          <div className="relative flex items-center justify-center my-1 sm:my-2 py-2 sm:py-4 w-full max-w-[320px] sm:max-w-[380px] mx-auto overflow-hidden">
            {/* Dynamic ambient halo ring */}
            <div 
              className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
                recordingState === 'recording'
                  ? breathPhase === 'Inhale'
                    ? 'w-56 h-56 sm:w-72 sm:h-72 bg-breath-sky/60 scale-110'
                    : breathPhase === 'Hold'
                    ? 'w-56 h-56 sm:w-72 sm:h-72 bg-caution-amber/20 scale-105'
                    : 'w-48 h-48 sm:w-64 sm:h-64 bg-breath-sky/40 scale-95'
                  : isDragOver
                  ? 'w-56 h-56 sm:w-72 sm:h-72 bg-breath-sky/80 scale-110'
                  : 'w-48 h-48 sm:w-64 sm:h-64 bg-breath-sky/40 animate-breathe-slow'
              }`}
            />

            {/* Outer Level Pulse Ring while recording */}
            {recordingState === 'recording' && (
              <div 
                className="absolute rounded-full border-2 border-breath-teal/40 transition-all duration-75 pointer-events-none"
                style={{
                  width: `${Math.min(270, 180 + (volumeLevel * 0.7))}px`,
                  height: `${Math.min(270, 180 + (volumeLevel * 0.7))}px`,
                }}
              />
            )}

            {/* Central Interactive Circle */}
            <button
              type="button"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (recordingState === 'idle') startRecording();
                else if (recordingState === 'recording') stopRecording();
              }}
              aria-label={recordingState === 'recording' ? 'Stop recording' : 'Start recording'}
              className={`relative z-10 w-48 h-48 xs:w-52 xs:h-52 sm:w-60 sm:h-60 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 select-none shadow-float touch-manipulation focus:outline-hidden focus:ring-4 focus:ring-breath-sky ${
                recordingState === 'recording'
                  ? breathPhase === 'Inhale'
                    ? 'bg-breath-teal text-white scale-105'
                    : breathPhase === 'Hold'
                    ? 'bg-[#257367] text-white scale-105'
                    : 'bg-breath-teal-dark text-white scale-95'
                  : recordingState === 'recorded'
                  ? 'bg-white border-2 border-breath-teal text-ink-primary'
                  : isDragOver
                  ? 'bg-breath-sky text-breath-teal border-2 border-breath-teal scale-105'
                  : 'bg-white border-2 border-breath-sky text-ink-primary hover:border-breath-teal hover:scale-102 breathe-glow'
              }`}
            >
              {recordingState === 'idle' && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-breath-sky-light text-breath-teal flex items-center justify-center shadow-2xs">
                    <MicIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="text-center px-2">
                    <span className="font-sora font-semibold text-sm sm:text-base block text-ink-primary">
                      Tap to record
                    </span>
                    <span className="text-[11px] sm:text-xs text-ink-secondary">
                      or drop .wav file
                    </span>
                  </div>
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-2xl sm:text-3xl animate-pulse">🫁</span>
                  <span className="font-sora font-bold text-lg sm:text-2xl tracking-tight">
                    {breathPhase}
                  </span>
                  <span className="text-xs font-semibold text-breath-sky font-mono bg-black/20 px-2 py-0.5 rounded-full">
                    00:{duration < 10 ? `0${duration}` : duration}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-white/80 pt-0.5">
                    Tap circle to finish
                  </span>
                </div>
              )}

              {recordingState === 'recorded' && (
                <div className="flex flex-col items-center space-y-1.5 p-3 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-breath-sky-light text-breath-teal flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-breath-teal" />
                  </div>
                  <div className="max-w-[140px] sm:max-w-[170px]">
                    <span className="font-sora font-semibold text-xs sm:text-sm text-ink-primary block truncate">
                      {file?.name || 'Recording ready'}
                    </span>
                    <span className="text-[11px] sm:text-xs text-breath-teal font-medium">
                      {duration > 0 ? `${duration}s audio ready` : 'Audio loaded'}
                    </span>
                  </div>
                  <span className="text-[10px] text-ink-muted">
                    Tap to re-record
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Live Audio Quality Meter while recording */}
          {recordingState === 'recording' && (
            <div className="w-full max-w-xs space-y-1.5 p-3 bg-white/90 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-center text-[11px] font-medium">
                <span className="text-ink-secondary">Live Breath Volume:</span>
                <span className={`font-semibold ${
                  volumeLevel < 10 
                    ? 'text-amber-600' 
                    : volumeLevel <= 70 
                    ? 'text-emerald-600' 
                    : 'text-rose-600'
                }`}>
                  {volumeLevel < 10 ? '🟡 Quiet (Get closer)' : volumeLevel <= 70 ? '🟢 Optimal Level' : '🔴 Too Loud'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-75 rounded-full ${
                    volumeLevel < 10 ? 'bg-amber-400' : volumeLevel <= 70 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, volumeLevel * 1.3)}%` }}
                />
              </div>
            </div>
          )}

          {/* Recording Preview & Action Controls */}
          {recordingState === 'recorded' && audioUrl && (
            <div className="w-full max-w-sm sm:max-w-md space-y-3 pt-1">
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex items-center gap-3">
                <audio src={audioUrl} controls className="w-full h-8 rounded-lg" />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className={`w-full min-h-[48px] py-3.5 px-6 rounded-2xl text-white font-sora font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 ${
                  loading 
                    ? 'bg-ink-muted cursor-not-allowed' 
                    : 'bg-breath-teal hover:bg-breath-teal-dark'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing breath acoustics...</span>
                  </>
                ) : (
                  <span>Run Respiratory Screening</span>
                )}
              </button>

              <button
                type="button"
                onClick={resetAll}
                disabled={loading}
                className="min-h-[44px] px-3 py-1.5 text-xs text-ink-secondary hover:text-ink-primary font-medium transition flex items-center justify-center mx-auto"
              >
                Discard and re-record
              </button>
            </div>
          )}

          {/* Secondary File Upload Option (when idle) */}
          {recordingState === 'idle' && (
            <div className="space-y-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,audio/wav,audio/mpeg"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div className="flex items-center justify-center gap-1.5 text-xs text-ink-secondary">
                <span>or upload recorded audio</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] px-2 text-breath-teal font-semibold hover:underline inline-flex items-center gap-1"
                >
                  [ choose audio file ]
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="w-full max-w-sm sm:max-w-md p-3.5 rounded-2xl bg-signal-coral-light border border-signal-coral/30 text-signal-coral text-xs flex items-center gap-2.5 text-left shadow-xs">
              <AlertCircleIcon className="w-4 h-4 shrink-0 text-signal-coral" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Guidance & Real-Time Tips */}
        <div className="md:col-span-5 space-y-3 sm:space-y-4 w-full">
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft text-left space-y-2.5 sm:space-y-3">
            <div className="text-xs sm:text-sm font-semibold text-ink-primary flex items-center gap-2 font-sora">
              <span className="text-base">🎙️</span>
              <span>Microphone Positioning Guide</span>
            </div>
            <ul className="text-xs text-ink-secondary space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-breath-teal font-bold text-sm leading-none mt-0.5">•</span>
                <span><strong>Placement:</strong> Hold phone/laptop mic <strong>5–10 cm</strong> from your mouth or upper neck/trachea.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-breath-teal font-bold text-sm leading-none mt-0.5">•</span>
                <span><strong>Breathing Method:</strong> Breathe deeply in and out through your <strong>open mouth</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-breath-teal font-bold text-sm leading-none mt-0.5">•</span>
                <span><strong>Quiet Environment:</strong> Turn off ceiling fans or background TV sounds for best signal clarity.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-breath-sky-light/60 border border-breath-sky/70 text-left space-y-1.5 sm:space-y-2">
            <div className="text-xs font-semibold text-ink-primary font-sora flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Intelligent Quality Gate</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              RespiraScreen automatically adjusts for room acoustics with adaptive pre-normalization. If audio is too noisy or faint, the system will provide immediate tips to re-record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
