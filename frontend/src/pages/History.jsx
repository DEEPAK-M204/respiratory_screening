import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api/client';
import { 
  RefreshCwIcon, 
  ChevronRightIcon, 
  AlertCircleIcon 
} from '../components/Icons';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await getHistory();
      setHistory(Array.isArray(records) ? records : []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Unable to load past checks right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    const now = new Date();
    
    // Check if today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="font-sora text-xl sm:text-2xl font-bold text-ink-primary tracking-tight">
            Screening History
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Past respiratory sound screening evaluations
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white border border-slate-200/80 text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition shadow-xs flex items-center justify-center disabled:opacity-50"
          title="Refresh list"
        >
          <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-signal-coral-light border border-signal-coral/20 text-signal-coral text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchHistory} className="font-semibold underline min-h-[44px] flex items-center px-2">Retry</button>
        </div>
      )}

      {/* Card List of Past Checks (1 column on mobile, 2 columns on desktop) */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center text-xs text-ink-muted">
            <div className="w-6 h-6 border-2 border-breath-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading past checks...
          </div>
        ) : history.length === 0 ? (
          <div className="p-10 sm:p-14 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-3 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-3xl bg-breath-sky-light text-breath-teal flex items-center justify-center mx-auto text-2xl shadow-xs">
              🫁
            </div>
            <div className="space-y-1">
              <h2 className="font-sora text-sm sm:text-base font-semibold text-ink-primary">No past checks yet</h2>
              <p className="text-xs text-ink-secondary max-w-xs mx-auto leading-relaxed">
                Complete your first breathing screening to see your history and reports here.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/screening')}
                className="min-h-[44px] px-5 py-2.5 bg-breath-teal hover:bg-breath-teal-dark text-white font-sora font-semibold text-xs sm:text-sm rounded-2xl shadow-xs transition active:scale-98 inline-flex items-center gap-2"
              >
                <span>Start your first check</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
            {history.map((rec, idx) => {
              const q = rec.quality || {};
              const qVal = typeof rec.Q === 'number' 
                ? rec.Q 
                : (typeof q.Q === 'number' ? q.Q : null);

              const confidence = typeof rec.confidence === 'number' ? rec.confidence : null;
              const confidencePct = confidence !== null ? `${(confidence * 100).toFixed(1)}%` : null;
              const prediction = rec.prediction || 'No prediction';
              const predictionSet = Array.isArray(rec.prediction_set) 
                ? rec.prediction_set 
                : (rec.prediction ? [rec.prediction] : []);

              const qualityPassed = qVal !== null ? qVal >= 0.35 : q.usable !== false;
              const confidencePassed = confidence !== null ? confidence >= 0.85 : false;
              const conformalPassed = predictionSet.includes(prediction);

              // Authoritative decision from backend if present, else derived fallback using all 3 conditions
              const isAccepted = rec.decision 
                ? rec.decision === 'ACCEPT' 
                : (qualityPassed && confidencePassed && conformalPassed);
              const decisionLabel = rec.decision || (isAccepted ? 'ACCEPT' : 'ABSTAIN');

              const filenameDisplay = rec.original_filename || rec.filename || 'Breathing Recording';

              return (
                <div
                  key={rec._id || rec.filename || idx}
                  onClick={() => navigate('/results', { state: { result: rec } })}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between gap-3 cursor-pointer hover:border-breath-sky hover:bg-slate-50/50 hover:shadow-md transition duration-150 active:scale-[0.99] group"
                >
                  {/* Top row: Filename, Date, & Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sora text-sm font-bold text-ink-primary wrap-break">
                          {prediction}
                        </span>
                        {confidencePct && isAccepted && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-ink-secondary">
                            {confidencePct}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-muted truncate font-mono">
                        {filenameDisplay}
                      </div>
                    </div>

                    <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 border ${
                      isAccepted
                        ? 'bg-emerald-50 text-breath-teal border-emerald-200/60'
                        : 'bg-rose-50 text-signal-coral border-rose-200/60'
                    }`}>
                      {decisionLabel}
                    </span>
                  </div>

                  {/* Bottom row: Time, Quality score, and Navigation chevron */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-ink-secondary">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-ink-secondary">
                        {formatRelativeTime(rec.created_at)}
                      </span>
                      {q.duration_sec && (
                        <span className="text-[10px] text-ink-muted">
                          • {q.duration_sec.toFixed(1)}s
                        </span>
                      )}
                      {qVal !== null && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-50 text-ink-secondary border border-slate-200/60">
                          Q: {qVal.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="text-ink-muted group-hover:text-breath-teal group-hover:translate-x-0.5 transition flex items-center gap-0.5 text-[11px] font-medium">
                      <span>View</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

