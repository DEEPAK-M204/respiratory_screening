import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api/client';
import { 
  ScreeningIcon,
  CheckCircleIcon, 
  AlertCircleIcon, 
  ShieldCheckIcon,
  AudioWaveIcon,
  RefreshCwIcon, 
  ChevronRightIcon,
  ArrowRightIcon
} from '../components/Icons';

export default function Dashboard() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await getHistory();
      setHistory(Array.isArray(records) ? records : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to fetch screening history from server. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics from actual history data
  const totalScreenings = history.length;
  
  const acceptedCount = history.filter((rec) => {
    if (rec.decision) return rec.decision === 'ACCEPT';
    const q = rec.quality || {};
    const qVal = typeof rec.Q === 'number' ? rec.Q : (typeof q.Q === 'number' ? q.Q : null);
    const confidence = typeof rec.confidence === 'number' ? rec.confidence : null;
    const prediction = rec.prediction || 'No prediction';
    const predictionSet = Array.isArray(rec.prediction_set) ? rec.prediction_set : (rec.prediction ? [rec.prediction] : []);
    return (qVal !== null ? qVal >= 0.35 : q.usable !== false) && (confidence !== null ? confidence >= 0.85 : false) && predictionSet.includes(prediction);
  }).length;

  const abstainedCount = totalScreenings - acceptedCount;
  
  const acceptanceRate = totalScreenings > 0 
    ? ((acceptedCount / totalScreenings) * 100).toFixed(1) 
    : '0.0';

  const qScores = history
    .map((rec) => (typeof rec.Q === 'number' ? rec.Q : (typeof rec.quality?.Q === 'number' ? rec.quality.Q : null)))
    .filter((q) => typeof q === 'number' && !isNaN(q));

  const averageQ = qScores.length > 0
    ? (qScores.reduce((sum, val) => sum + val, 0) / qScores.length).toFixed(3)
    : null;

  // Confidence metrics
  const confScores = history
    .map((rec) => (typeof rec.confidence === 'number' ? rec.confidence : null))
    .filter((c) => c !== null && !isNaN(c));

  const avgConfidence = confScores.length > 0
    ? ((confScores.reduce((sum, val) => sum + val, 0) / confScores.length) * 100).toFixed(1)
    : null;

  // Most frequent predicted class
  const classFrequency = {};
  history.forEach((rec) => {
    if (rec.prediction) {
      classFrequency[rec.prediction] = (classFrequency[rec.prediction] || 0) + 1;
    }
  });

  let mostFrequentClass = null;
  let highestCount = 0;
  Object.entries(classFrequency).forEach(([cls, count]) => {
    if (count > highestCount) {
      highestCount = count;
      mostFrequentClass = cls;
    }
  });

  // Recent activity timeline (last 5 active dates)
  const activityMap = {};
  history.forEach((rec) => {
    if (rec.created_at) {
      try {
        const d = new Date(rec.created_at);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          activityMap[key] = (activityMap[key] || 0) + 1;
        }
      } catch {}
    }
  });
  const recentTimeline = Object.entries(activityMap).reverse().slice(-5);
  const maxActivityDay = recentTimeline.length > 0 ? Math.max(...recentTimeline.map(([, count]) => count)) : 1;

  const recentScreenings = history.slice(0, 5);

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString(undefined, { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

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
    <div className="w-full space-y-5 sm:space-y-6 md:space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
            RespiraScreen Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Overview of respiratory screening activity and quality metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-white border border-slate-200/80 text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition shadow-xs disabled:opacity-50 flex items-center justify-center"
            title="Refresh dashboard"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/screening')}
            className="min-h-[44px] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-breath-teal hover:bg-breath-teal-dark text-white text-xs sm:text-sm font-sora font-semibold shadow-xs transition active:scale-98"
          >
            <ScreeningIcon className="w-4 h-4" />
            <span>Start New Screening</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-signal-coral-light border border-signal-coral/30 text-signal-coral text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircleIcon className="w-5 h-5 shrink-0 text-signal-coral" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchDashboardData} 
            className="font-sora font-semibold underline hover:no-underline ml-3 shrink-0 min-h-[44px] flex items-center"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft animate-pulse space-y-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100" />
                <div className="w-20 h-4 bg-slate-100 rounded" />
                <div className="w-12 h-6 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="h-56 bg-white rounded-3xl border border-slate-200/80 shadow-soft animate-pulse" />
        </div>
      ) : totalScreenings === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-14 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-breath-sky-light text-breath-teal flex items-center justify-center mx-auto text-3xl shadow-xs">
            🫁
          </div>
          <div className="space-y-1.5">
            <h2 className="font-sora text-lg sm:text-xl font-bold text-ink-primary">
              No screenings yet
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-sm mx-auto leading-relaxed">
              Start your first breathing sound check to see your results here.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/screening')}
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 bg-breath-teal hover:bg-breath-teal-dark text-white font-sora font-semibold text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-98"
            >
              <span>Start your first screening</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Dashboard Content when records exist */
        <div className="space-y-5 sm:space-y-6">
          {/* Key Metric Stats Cards (2 cols on mobile/tablet, 4 cols on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Stat 1: Total Screenings */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Total Screenings</span>
                <div className="p-2 rounded-xl bg-breath-sky-light text-breath-teal">
                  <AudioWaveIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold font-sora text-ink-primary">
                  {totalScreenings}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  Saved evaluations
                </div>
              </div>
            </div>

            {/* Stat 2: Accepted */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Accepted</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-breath-teal">
                  <CheckCircleIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold font-sora text-breath-teal">
                  {acceptedCount}
                </div>
                <div className="text-[11px] text-breath-teal font-medium mt-0.5">
                  {acceptanceRate}% acceptance rate
                </div>
              </div>
            </div>

            {/* Stat 3: Abstained */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Abstained</span>
                <div className="p-2 rounded-xl bg-rose-50 text-signal-coral">
                  <AlertCircleIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold font-sora text-signal-coral">
                  {abstainedCount}
                </div>
                <div className="text-[11px] text-signal-coral font-medium mt-0.5">
                  Safety retry triggers
                </div>
              </div>
            </div>

            {/* Stat 4: Average Quality */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Average Quality</span>
                <div className="p-2 rounded-xl bg-teal-50 text-breath-teal">
                  <ShieldCheckIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold font-sora text-ink-primary">
                  {averageQ ? `${averageQ}` : '—'}
                  {averageQ && <span className="text-xs font-normal text-ink-muted"> / 1.0</span>}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {averageQ && Number(averageQ) >= 0.60 
                    ? 'High signal clarity' 
                    : averageQ 
                    ? 'Adequate acoustic quality' 
                    : 'Awaiting recordings'}
                </div>
              </div>
            </div>
          </div>

          {/* Integrated Analytics Summary Card (Compact, Responsive) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left: Decision Safety Bar & Confidence (Col 7) */}
            <div className="md:col-span-7 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary">
                    Safety Decision Breakdown
                  </h2>
                  <p className="text-[11px] text-ink-secondary">Selective classification decision distribution</p>
                </div>
                <span className="text-xs font-mono font-semibold text-breath-teal">
                  {acceptanceRate}% Passed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                  <div 
                    className="h-full bg-breath-teal transition-all duration-500" 
                    style={{ width: `${acceptanceRate}%` }} 
                  />
                  <div 
                    className="h-full bg-rose-400 transition-all duration-500" 
                    style={{ width: `${100 - Number(acceptanceRate)}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                  <span><strong>ACCEPT</strong>: {acceptedCount} ({acceptanceRate}%)</span>
                  <span><strong>ABSTAIN</strong>: {abstainedCount} ({(100 - Number(acceptanceRate)).toFixed(1)}%)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-ink-muted block">Avg Q-ATS Confidence</span>
                  <span className="font-sora font-bold text-sm text-ink-primary">
                    {avgConfidence ? `${avgConfidence}%` : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-ink-muted block">Top Predicted Pattern</span>
                  <span className="font-sora font-bold text-sm text-breath-teal truncate block">
                    {mostFrequentClass || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Recent Screening Activity Timeline (Col 5) */}
            <div className="md:col-span-5 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-3 flex flex-col justify-between">
              <div>
                <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary">
                  Screening Activity
                </h2>
                <p className="text-[11px] text-ink-secondary">Recent daily screening volume</p>
              </div>

              {recentTimeline.length === 0 ? (
                <div className="py-4 text-center text-xs text-ink-muted">
                  Perform screenings to view timeline activity.
                </div>
              ) : (
                <div className="flex items-end justify-between gap-2 h-20 px-1 border-b border-slate-100 pb-1">
                  {recentTimeline.map(([date, count]) => {
                    const height = Math.max((count / maxActivityDay) * 100, 20);
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
                        <span className="text-[10px] font-mono text-ink-muted font-semibold">{count}</span>
                        <div 
                          className="w-full max-w-[20px] bg-breath-teal rounded-t-md transition-all" 
                          style={{ height: `${height}%` }} 
                        />
                        <span className="text-[9px] text-ink-secondary truncate max-w-full">{date}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Screenings Section */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-4 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h2 className="font-sora text-base sm:text-lg font-bold text-ink-primary">
                  Recent Screenings
                </h2>
                <p className="text-xs text-ink-secondary">
                  Showing latest {recentScreenings.length} evaluations
                </p>
              </div>

              <button
                onClick={() => navigate('/history')}
                className="text-xs font-sora font-semibold text-breath-teal hover:underline flex items-center gap-1 min-h-[44px] px-2"
              >
                <span>View All</span>
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Records List (Stacked, mobile-responsive cards) */}
            <div className="divide-y divide-slate-100">
              {recentScreenings.map((rec, idx) => {
                const q = rec.quality || {};
                const qVal = typeof rec.Q === 'number' ? rec.Q : (typeof q.Q === 'number' ? q.Q : null);
                const isAccept = rec.decision 
                  ? rec.decision === 'ACCEPT' 
                  : (qVal !== null && qVal >= 0.35);
                
                const qDisplay = qVal !== null ? qVal.toFixed(2) : null;
                const predictionLabel = rec.prediction || 'No prediction';
                const confidencePct = typeof rec.confidence === 'number' ? `${Math.round(rec.confidence * 100)}%` : null;

                return (
                  <div
                    key={rec._id || rec.filename || idx}
                    onClick={() => navigate('/results', { state: { result: rec } })}
                    className="py-3 px-2 sm:px-3 rounded-2xl flex items-center justify-between gap-2.5 hover:bg-slate-50 transition cursor-pointer group active:scale-[0.99]"
                  >
                    {/* Left details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${isAccept ? 'bg-breath-teal' : 'bg-signal-coral'}`} />
                      
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sora text-xs sm:text-sm font-semibold text-ink-primary truncate">
                            {predictionLabel}
                          </span>
                          {confidencePct && isAccept && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 font-mono text-ink-secondary">
                              {confidencePct}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-secondary truncate">
                          {formatTimestamp(rec.created_at)}
                          {q.duration_sec ? ` • ${q.duration_sec}s` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Right tags */}
                    <div className="flex items-center gap-2 shrink-0">
                      {qDisplay && (
                        <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-ink-secondary hidden xs:inline-block">
                          Q: {qDisplay}
                        </span>
                      )}

                      <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        isAccept
                          ? 'bg-emerald-50 text-breath-teal border-emerald-200/60'
                          : 'bg-rose-50 text-signal-coral border-rose-200/60'
                      }`}>
                        {isAccept ? 'ACCEPT' : 'ABSTAIN'}
                      </span>

                      <div className="text-ink-muted group-hover:text-ink-primary group-hover:translate-x-0.5 transition hidden sm:block">
                        <ChevronRightIcon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
