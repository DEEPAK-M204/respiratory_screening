import { useState, useEffect } from 'react';
import { checkHealth, getHistory } from '../api/client';
import { 
  ShieldCheckIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  RefreshCwIcon 
} from '../components/Icons';

export default function Learn() {
  const [showTechnical, setShowTechnical] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [historyStats, setHistoryStats] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const verifyHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await checkHealth();
      setBackendStatus(res?.status === 'ok' ? 'Online' : 'Degraded');
    } catch {
      setBackendStatus('Offline');
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadStats = async () => {
    try {
      const records = await getHistory();
      if (Array.isArray(records) && records.length > 0) {
        const total = records.length;
        const usable = records.filter((r) => r.quality?.usable !== false && (r.quality?.Q === undefined || r.quality?.Q >= 0.35)).length;
        const avgQ = (records.reduce((sum, r) => sum + (r.quality?.Q || 0), 0) / total).toFixed(2);
        const avgDuration = (records.reduce((sum, r) => sum + (r.quality?.duration_sec || 0), 0) / total).toFixed(1);
        const avgSNR = (records.reduce((sum, r) => sum + (r.quality?.snr_db || 0), 0) / total).toFixed(1);
        setHistoryStats({ total, usable, passRate: Math.round((usable / total) * 100), avgQ, avgDuration, avgSNR });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    verifyHealth();
    loadStats();
  }, []);

  const steps = [
    {
      number: '1',
      title: 'Find a quiet place',
      desc: 'Move to a quiet room without TV sound, pets, or loud background traffic.',
      icon: '🤫',
    },
    {
      number: '2',
      title: 'Position your phone',
      desc: 'Hold your microphone 2–3 cm away from your chest or throat area.',
      icon: '📱',
    },
    {
      number: '3',
      title: 'Breathe at a calm pace',
      desc: 'Follow the breathing rhythm on the screen for about 6 to 10 seconds.',
      icon: '🫁',
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-sora text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
          How RespiraScreen works
        </h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Simple guidance for accurate breathing sound checks
        </p>
      </div>

      {/* 3 Simple Steps (Responsive 3-Column on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div 
            key={s.number}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-soft flex flex-col justify-between space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-breath-sky-light text-breath-teal font-sora font-bold text-lg flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div className="space-y-1">
              <h2 className="font-sora text-sm font-semibold text-ink-primary">
                {s.number}. {s.title}
              </h2>
              <p className="text-xs text-ink-secondary leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent Medical Advisory Disclaimer */}
      <div className="p-5 md:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-2.5">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-sora font-semibold text-ink-primary">
          <ShieldCheckIcon className="w-5 h-5 text-breath-teal" />
          <span>Medical Advisory Notice</span>
        </div>
        <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
          RespiraScreen is an academic screening decision-support aid designed to assess audio recording quality. It is <strong>not a medical device</strong> and does not replace medical advice, diagnosis, or treatment by a qualified doctor. If you are experiencing difficulty breathing or acute health symptoms, seek immediate professional medical attention.
        </p>
      </div>

      {/* Technical Details Accordion (De-emphasized for curious users) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnical(!showTechnical)}
          className="w-full p-5 flex items-center justify-between text-left text-xs sm:text-sm font-sora font-semibold text-ink-primary hover:bg-slate-50/70 transition"
        >
          <div className="flex items-center gap-2">
            <span>Technical &amp; System Details</span>
            <span className="text-xs font-sans font-normal text-ink-muted">
              (Optional Reference)
            </span>
          </div>
          <div className="text-ink-secondary flex items-center gap-1 text-xs font-sans">
            <span>{showTechnical ? 'Hide' : 'Show'}</span>
            {showTechnical ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </div>
        </button>

        {showTechnical && (
          <div className="p-5 pt-0 border-t border-slate-100 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* System Connection */}
              <div className="space-y-3 p-4 rounded-2xl bg-canvas border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-primary text-xs sm:text-sm">System Connectivity</span>
                  <button 
                    onClick={verifyHealth} 
                    className="text-ink-muted hover:text-ink-primary p-1"
                    title="Test connection"
                  >
                    <RefreshCwIcon className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-ink-secondary">
                  <div className="flex justify-between">
                    <span>FastAPI Analysis Engine:</span>
                    <span className={`font-semibold ${backendStatus === 'Online' ? 'text-breath-teal' : 'text-signal-coral'}`}>
                      {backendStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audio Resampling:</span>
                    <span>22,050 Hz Mono PCM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality Gate Threshold:</span>
                    <span>Q ≥ 0.35 (Abstain below 0.35)</span>
                  </div>
                </div>
              </div>

              {/* Aggregate Stats */}
              <div className="space-y-3 p-4 rounded-2xl bg-canvas border border-slate-200/60">
                <div className="font-semibold text-ink-primary text-xs sm:text-sm">Aggregate Acoustic Analytics</div>
                {historyStats ? (
                  <div className="space-y-2 text-xs text-ink-secondary">
                    <div className="flex justify-between">
                      <span>Total Checks Recorded:</span>
                      <span className="font-bold text-ink-primary">{historyStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality Pass Rate:</span>
                      <span>{historyStats.passRate}% ({historyStats.usable} passed)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mean Signal-to-Noise:</span>
                      <span>{historyStats.avgSNR} dB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mean Recording Length:</span>
                      <span>{historyStats.avgDuration}s</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">No historical records available yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
