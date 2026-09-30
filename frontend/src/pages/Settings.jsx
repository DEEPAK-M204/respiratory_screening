import { useState, useEffect } from 'react';
import { 
  SettingsIcon, 
  ShieldCheckIcon, 
  AudioWaveIcon, 
  RefreshCwIcon, 
  InfoIcon 
} from '../components/Icons';
import { API_BASE_URL, checkHealth } from '../api/client';

export default function Settings() {
  const [healthStatus, setHealthStatus] = useState(null); // null | 'connected' | 'offline'
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await checkHealth();
      if (res?.status === 'ok') {
        setHealthStatus('connected');
      } else {
        setHealthStatus('offline');
      }
    } catch {
      setHealthStatus('offline');
    } finally {
      setChecking(false);
      setLastChecked(new Date().toLocaleTimeString(undefined, { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      }));
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="font-sora text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-1">
          Application configuration and screening system information.
        </p>
      </div>

      {/* 2-COLUMN RESPONSIVE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Backend, Screening System, Audio Specs & About (Col 6) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* 2. BACKEND CONNECTION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-breath-sky-light text-breath-teal">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-sora text-base font-bold text-ink-primary">
                    Backend Connection
                  </h2>
                  <p className="text-xs text-ink-secondary">FastAPI screening API service</p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                healthStatus === 'connected'
                  ? 'bg-emerald-50 text-breath-teal border-emerald-200/80'
                  : healthStatus === 'offline'
                  ? 'bg-rose-50 text-signal-coral border-rose-200/80'
                  : 'bg-amber-50 text-caution-amber border-amber-200/80'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  healthStatus === 'connected'
                    ? 'bg-breath-teal'
                    : healthStatus === 'offline'
                    ? 'bg-signal-coral'
                    : 'bg-caution-amber animate-pulse'
                }`} />
                <span>
                  {healthStatus === 'connected' ? 'Connected' : healthStatus === 'offline' ? 'Unavailable' : 'Checking...'}
                </span>
              </span>
            </div>

            {/* API Endpoint Display */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-ink-secondary block">API Base URL</span>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 font-mono text-xs text-ink-primary break-all flex items-center justify-between gap-2">
                <span>{API_BASE_URL}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-ink-muted shrink-0 font-sans">
                  Port 8000
                </span>
              </div>
            </div>

            {/* Connection Check Action */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[11px] text-ink-muted">
                {lastChecked ? `Last verified: ${lastChecked}` : 'Checking health status...'}
              </span>

              <button
                onClick={runHealthCheck}
                disabled={checking}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-ink-secondary hover:text-ink-primary font-sora font-semibold text-xs transition shadow-2xs disabled:opacity-50"
              >
                <RefreshCwIcon className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Checking...' : 'Check Connection'}</span>
              </button>
            </div>
          </div>

          {/* 3. SCREENING SYSTEM CONFIGURATION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-breath-sky-light text-breath-teal">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-sora text-base font-bold text-ink-primary">
                  Screening System
                </h2>
                <p className="text-xs text-ink-secondary">Deep learning model architecture</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-ink-secondary divide-y divide-slate-100">
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Model Architecture:</span>
                <span className="font-mono text-ink-primary font-semibold">CNN + BiLSTM (RespiratoryCNNBiLSTM)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Input Modality:</span>
                <span className="text-ink-primary">Respiratory audio</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Supported Formats:</span>
                <span className="font-mono text-ink-primary">WAV, MP3</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Sampling Preprocessing:</span>
                <span className="font-mono text-ink-primary">16 kHz internal resampling</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-ink-secondary block">Configured Classification Classes (5):</span>
              <div className="flex flex-wrap gap-1.5">
                {['Normal', 'Asthma', 'COPD', 'Pneumonia', 'Bronchial'].map((cls) => (
                  <span key={cls} className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-ink-primary">
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-ink-muted leading-relaxed">
              Configured for academic research screening demonstration. Not intended as medical-grade diagnostic hardware specifications.
            </p>
          </div>

          {/* 8. AUDIO REQUIREMENTS */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-breath-sky-light text-breath-teal">
                <AudioWaveIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-sora text-base font-bold text-ink-primary">
                  Audio Requirements
                </h2>
                <p className="text-xs text-ink-secondary">Signal capture & pipeline standardization</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-ink-secondary divide-y divide-slate-100">
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Accepted Audio:</span>
                <span className="font-mono text-ink-primary">WAV / MP3</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Channels:</span>
                <span className="text-ink-primary">Mono audio</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Standardized Duration:</span>
                <span className="font-mono text-ink-primary">5.0-second model input window</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-ink-primary">Frequency Filtering:</span>
                <span className="font-mono text-ink-primary">100 Hz – 2000 Hz bandpass</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-ink-secondary leading-relaxed">
              Recording quality can affect the screening decision. For best results, record in a quiet environment and keep the phone microphone unobstructed.
            </div>
          </div>

          {/* 9. APPLICATION INFORMATION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3">
            <h2 className="font-sora text-base font-bold text-ink-primary">
              About RespiraScreen
            </h2>
            <div className="space-y-1">
              <div className="font-sora text-sm font-bold text-breath-teal">
                RespiraScreen
              </div>
              <p className="text-xs text-ink-secondary leading-relaxed font-medium">
                A Safety-Aware Deep Learning Framework for Respiratory Sound Screening Using Calibrated Confidence and Selective Prediction
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-ink-muted">
              <span>Final Year Project</span>
              <span className="font-mono text-[11px]">Academic Version 2.0</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RQA, Selective Prediction, Q-ATS & Conformal Settings (Col 6) */}
        <div className="lg:col-span-6 space-y-6">

          {/* 4. RECORDING QUALITY ASSESSMENT (RQA) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
            <div>
              <h2 className="font-sora text-base font-bold text-ink-primary">
                Recording Quality Assessment
              </h2>
              <p className="text-xs text-ink-secondary">
                Pre-inference acoustic quality evaluation
              </p>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Recording quality is evaluated before model decision-making using duration, clipping, silence, and SNR-related measures.
            </p>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-900 block font-sora">
                  Minimum Quality Safety Threshold
                </span>
                <span className="text-[11px] text-emerald-800">
                  Current application safety threshold
                </span>
              </div>
              <span className="font-mono text-lg font-bold text-breath-teal">
                Q &ge; 0.35
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-ink-secondary pt-1">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Duration Target:</span>
                <span className="font-mono text-ink-primary font-semibold">&ge; 5.0 s</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Clipping Ratio Limit:</span>
                <span className="font-mono text-ink-primary font-semibold">&lt; 0.8%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Silence Ratio Limit:</span>
                <span className="font-mono text-ink-primary font-semibold">&lt; 60%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Signal-to-Noise Target:</span>
                <span className="font-mono text-ink-primary font-semibold">&ge; 10 dB</span>
              </div>
            </div>
          </div>

          {/* 5. SELECTIVE PREDICTION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
            <div>
              <h2 className="font-sora text-base font-bold text-ink-primary">
                Selective Prediction
              </h2>
              <p className="text-xs text-ink-secondary">
                Safety-aware abstention policy
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-0.5">
                <span className="text-[11px] text-ink-muted uppercase block font-semibold">Confidence Threshold</span>
                <span className="font-sora font-bold text-xl text-breath-teal">&tau; = 0.85</span>
                <span className="text-[10px] text-ink-secondary block">85.0% selective threshold</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-0.5">
                <span className="text-[11px] text-ink-muted uppercase block font-semibold">Quality Threshold</span>
                <span className="font-sora font-bold text-xl text-breath-teal">Q = 0.35</span>
                <span className="text-[10px] text-ink-secondary block">0.350 safety floor</span>
              </div>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              When the screening result does not satisfy the configured safety conditions, the system abstains rather than presenting the result as an accepted screening pattern.
            </p>
          </div>

          {/* 6. CONFIDENCE CALIBRATION (Q-ATS) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
            <div>
              <h2 className="font-sora text-base font-bold text-ink-primary">
                Confidence Calibration
              </h2>
              <p className="text-xs text-ink-secondary">
                Quality-Aware Temperature Scaling (Q-ATS)
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 font-mono text-xs space-y-2 text-ink-primary">
              <div className="flex justify-between">
                <span>Baseline Temperature (T₀):</span>
                <span className="font-bold">1.3876</span>
              </div>
              <div className="flex justify-between">
                <span>Quality Multiplier (&alpha;):</span>
                <span className="font-bold">4.784528</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-breath-teal font-bold">
                <span>Temperature Function:</span>
                <span>T(Q) = T₀ + &alpha;(1 − Q)</span>
              </div>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              Q-ATS adjusts the model's probability distribution based on recording quality to reduce overconfident predictions when recording quality is lower.
            </p>
          </div>

          {/* 7. CONFORMAL PREDICTION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3.5">
            <div>
              <h2 className="font-sora text-base font-bold text-ink-primary">
                Conformal Prediction
              </h2>
              <p className="text-xs text-ink-secondary">
                Class-conditional statistical coverage
              </p>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed">
              The system uses class-conditional conformal prediction to produce a prediction set rather than relying only on the highest-probability class.
            </p>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-ink-secondary block">Evaluated Prediction Set Classes:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Normal', 'Asthma', 'COPD', 'Pneumonia', 'Bronchial'].map((cls) => (
                  <span key={cls} className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-ink-primary">
                    {cls}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 10. MEDICAL / RESEARCH NOTICE (Full Width at Bottom) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-2">
        <div className="flex items-center gap-2 text-xs font-sora font-bold text-ink-primary">
          <InfoIcon className="w-4 h-4 text-breath-teal" />
          <span>Research & Safety Notice</span>
        </div>
        <p className="text-xs text-ink-secondary leading-relaxed">
          RespiraScreen is intended for respiratory sound screening and academic research demonstration. It does not provide a medical diagnosis. Screening results should not replace evaluation by a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
}
