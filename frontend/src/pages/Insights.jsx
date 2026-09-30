import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api/client';
import { 
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  AudioWaveIcon,
  RefreshCwIcon,
  ScreeningIcon,
  ArrowRightIcon,
  InfoIcon
} from '../components/Icons';

export default function Insights() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const records = await getHistory();
      setHistory(Array.isArray(records) ? records : []);
    } catch (err) {
      console.error('Failed to load screening insights:', err);
      setError('Unable to load screening insights. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // 1. Overview metrics
  const total = history.length;

  const acceptedRecords = history.filter((rec) => {
    if (rec.decision) return rec.decision === 'ACCEPT';
    const q = rec.quality || {};
    return q.usable !== false && (q.Q === undefined || q.Q >= 0.35);
  });
  const acceptedCount = acceptedRecords.length;
  const abstainedCount = total - acceptedCount;
  const acceptanceRate = total > 0 ? ((acceptedCount / total) * 100).toFixed(1) : '0.0';
  const abstentionRate = total > 0 ? ((abstainedCount / total) * 100).toFixed(1) : '0.0';

  // 2. Quality analysis (Q)
  const qValues = history
    .map((rec) => (typeof rec.Q === 'number' ? rec.Q : (typeof rec.quality?.Q === 'number' ? rec.quality.Q : null)))
    .filter((v) => v !== null && !isNaN(v));

  const avgQ = qValues.length > 0
    ? (qValues.reduce((s, v) => s + v, 0) / qValues.length).toFixed(3)
    : null;
  const maxQ = qValues.length > 0 ? Math.max(...qValues).toFixed(3) : null;
  const minQ = qValues.length > 0 ? Math.min(...qValues).toFixed(3) : null;

  // Application quality categories (UI only, Q_min = 0.35)
  const goodQualityCount = qValues.filter((q) => q >= 0.70).length;
  const adequateQualityCount = qValues.filter((q) => q >= 0.35 && q < 0.70).length;
  const needsAttentionCount = qValues.filter((q) => q < 0.35).length;

  // 3. Model prediction class distribution
  const allPredictedClasses = ['Normal', 'Asthma', 'COPD', 'Pneumonia', 'Bronchial'];
  const predictionCounts = {};
  allPredictedClasses.forEach((c) => { predictionCounts[c] = 0; });
  let validPredictionsCount = 0;

  history.forEach((rec) => {
    if (rec.prediction) {
      predictionCounts[rec.prediction] = (predictionCounts[rec.prediction] || 0) + 1;
      validPredictionsCount++;
    }
  });

  const predictionList = Object.entries(predictionCounts)
    .map(([cls, count]) => ({
      name: cls,
      count,
      pct: validPredictionsCount > 0 ? ((count / validPredictionsCount) * 100).toFixed(1) : '0.0',
    }))
    .sort((a, b) => b.count - a.count);

  const maxPredictionCount = Math.max(...predictionList.map((p) => p.count), 1);

  // 4. Model confidence analysis
  const confValues = history
    .map((rec) => (typeof rec.confidence === 'number' ? rec.confidence : null))
    .filter((v) => v !== null && !isNaN(v));

  const avgConf = confValues.length > 0
    ? ((confValues.reduce((s, v) => s + v, 0) / confValues.length) * 100).toFixed(1)
    : null;
  const maxConf = confValues.length > 0 ? (Math.max(...confValues) * 100).toFixed(1) : null;
  const minConf = confValues.length > 0 ? (Math.min(...confValues) * 100).toFixed(1) : null;

  const confAboveThreshold = confValues.filter((c) => c >= 0.85).length;
  const confBelowThreshold = confValues.filter((c) => c < 0.85).length;
  const totalConfEvaluated = confValues.length;
  const confAbovePct = totalConfEvaluated > 0 
    ? ((confAboveThreshold / totalConfEvaluated) * 100).toFixed(1) 
    : '0.0';

  // 5. Abstention reasons aggregation
  const reasonCounts = {};
  history.forEach((rec) => {
    if (Array.isArray(rec.abstain_reasons)) {
      rec.abstain_reasons.forEach((reason) => {
        if (typeof reason === 'string' && reason.trim()) {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
      });
    }
  });

  const reasonList = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  const maxReasonCount = reasonList.length > 0 ? Math.max(...reasonList.map((r) => r.count)) : 1;

  // 6. Conformal prediction set insights
  let singleClassSets = 0;
  let multiClassSets = 0;
  let emptySets = 0;
  let totalSetSizes = 0;
  let recordsWithSets = 0;

  history.forEach((rec) => {
    if (Array.isArray(rec.prediction_set)) {
      recordsWithSets++;
      const size = rec.prediction_set.length;
      totalSetSizes += size;
      if (size === 1) singleClassSets++;
      else if (size > 1) multiClassSets++;
      else if (size === 0) emptySets++;
    }
  });

  const avgSetSize = recordsWithSets > 0 
    ? (totalSetSizes / recordsWithSets).toFixed(2) 
    : null;

  // 7. Recent activity timeline
  const activityByDate = {};
  history.forEach((rec) => {
    if (rec.created_at) {
      try {
        const d = new Date(rec.created_at);
        if (!isNaN(d.getTime())) {
          const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          activityByDate[key] = (activityByDate[key] || 0) + 1;
        }
      } catch {}
    }
  });

  const activityTimeline = Object.entries(activityByDate).map(([date, count]) => ({
    date,
    count,
  }));
  const sortedActivity = activityTimeline.reverse().slice(-7);
  const maxActivityCount = sortedActivity.length > 0 ? Math.max(...sortedActivity.map((a) => a.count)) : 1;

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-ink-primary tracking-tight">
            Screening Insights
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Understand screening activity, recording quality, model confidence, and safety decisions.
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted mt-1.5">
            <InfoIcon className="w-3.5 h-3.5 shrink-0 text-breath-teal" />
            <span>These insights describe screening-system behavior and are not medical conclusions.</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white border border-slate-200/80 text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/screening')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-breath-teal hover:bg-breath-teal-dark text-white text-xs sm:text-sm font-sora font-semibold shadow-xs transition active:scale-98"
          >
            <ScreeningIcon className="w-4 h-4" />
            <span>New Screening</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-signal-coral-light border border-signal-coral/30 text-signal-coral text-xs sm:text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircleIcon className="w-5 h-5 shrink-0 text-signal-coral" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchInsights} 
            className="font-sora font-semibold underline hover:no-underline ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft animate-pulse space-y-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100" />
                <div className="w-20 h-4 bg-slate-100 rounded" />
                <div className="w-12 h-6 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-white rounded-3xl border border-slate-200/80 shadow-soft animate-pulse" />
            <div className="h-64 bg-white rounded-3xl border border-slate-200/80 shadow-soft animate-pulse" />
          </div>
        </div>
      ) : total === 0 ? (
        /* Empty State */
        <div className="p-10 sm:p-14 text-center bg-white rounded-3xl border border-slate-200/80 shadow-soft space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-breath-sky-light text-breath-teal flex items-center justify-center mx-auto text-3xl shadow-xs">
            📈
          </div>
          <div className="space-y-1.5">
            <h2 className="font-sora text-lg sm:text-xl font-bold text-ink-primary">
              No screening insights yet
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-sm mx-auto leading-relaxed">
              Complete a few respiratory sound screenings to see system analytics here.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/screening')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-breath-teal hover:bg-breath-teal-dark text-white font-sora font-semibold text-xs sm:text-sm rounded-2xl shadow-sm transition active:scale-98"
            >
              <span>Start New Screening</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Insights Dashboard Content */
        <div className="space-y-6">
          {/* 3. OVERVIEW METRICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* 1. Total Screenings */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Total Screenings</span>
                <div className="p-2 rounded-xl bg-breath-sky-light text-breath-teal">
                  <AudioWaveIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold font-sora text-ink-primary">
                  {total}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  Evaluated recordings
                </div>
              </div>
            </div>

            {/* 2. Accepted */}
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

            {/* 3. Abstained */}
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
                  {abstentionRate}% safety retry rate
                </div>
              </div>
            </div>

            {/* 4. Average Quality */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-secondary">Average Quality</span>
                <div className="p-2 rounded-xl bg-teal-50 text-breath-teal">
                  <ShieldCheckIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-bold font-sora text-ink-primary">
                  {avgQ !== null ? avgQ : '—'}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {qValues.length} acoustic checks evaluated
                </div>
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN INSIGHTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Safety Decisions, Predictions, & Activity Timeline (Col 6/7) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* 4. SAFETY DECISION DISTRIBUTION */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sora text-base font-bold text-ink-primary">
                      Safety Decision Distribution
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Screening decision distribution across history
                    </p>
                  </div>
                  <span className="text-xs font-sora font-semibold text-breath-teal">
                    {acceptanceRate}% Accepted
                  </span>
                </div>

                {/* Progress Distribution Bar */}
                <div className="space-y-2">
                  <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                    <div 
                      className="h-full bg-breath-teal transition-all duration-500" 
                      style={{ width: `${acceptanceRate}%` }}
                      title={`Accepted: ${acceptedCount} (${acceptanceRate}%)`}
                    />
                    <div 
                      className="h-full bg-rose-400 transition-all duration-500" 
                      style={{ width: `${abstentionRate}%` }}
                      title={`Abstained: ${abstainedCount} (${abstentionRate}%)`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-secondary pt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-breath-teal inline-block" />
                      <span><strong>ACCEPT</strong>: {acceptedCount} ({acceptanceRate}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                      <span><strong>ABSTAIN</strong>: {abstainedCount} ({abstentionRate}%)</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-canvas/60 border border-slate-200/60 text-[11px] text-ink-muted leading-relaxed">
                  Selective classification rule ensures the model outputs predictions only when quality ($Q \ge 0.35$), confidence ($\ge 85\%$), and conformal prediction set criteria are simultaneously met.
                </div>
              </div>

              {/* 5. MODEL PREDICTION CLASS DISTRIBUTION */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div>
                  <h2 className="font-sora text-base font-bold text-ink-primary">
                    Model Prediction Distribution
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Number of screenings by predicted acoustic pattern
                  </p>
                </div>

                {/* Horizontal Bar Chart */}
                <div className="space-y-3 pt-1">
                  {predictionList.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-primary">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-primary font-sora">{item.count}</span>
                          <span className="text-[11px] text-ink-muted font-mono">({item.pct}%)</span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-breath-teal transition-all duration-500"
                          style={{
                            width: `${maxPredictionCount > 0 ? (item.count / maxPredictionCount) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-ink-muted leading-relaxed pt-1">
                  Shows frequency of acoustic patterns identified across completed screenings. Does not represent patient population statistics or clinical prevalence.
                </p>
              </div>

              {/* 10. RECENT SCREENING ACTIVITY */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div>
                  <h2 className="font-sora text-base font-bold text-ink-primary">
                    Recent Screening Activity
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Timeline of recorded screening sessions
                  </p>
                </div>

                {sortedActivity.length < 2 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-ink-muted">
                    More screenings are needed to display a meaningful activity trend.
                  </div>
                ) : (
                  <div className="pt-2">
                    <div className="flex items-end justify-between gap-2 h-32 px-2 pb-2 border-b border-slate-200/80">
                      {sortedActivity.map((act) => {
                        const heightPct = Math.max((act.count / maxActivityCount) * 100, 15);
                        return (
                          <div key={act.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-mono text-ink-muted group-hover:text-breath-teal font-semibold">
                              {act.count}
                            </span>
                            <div
                              className="w-full max-w-[28px] bg-breath-sky text-breath-teal hover:bg-breath-teal rounded-t-lg transition-all"
                              style={{ height: `${heightPct}%` }}
                            />
                            <span className="text-[10px] text-ink-secondary truncate max-w-full text-center">
                              {act.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Quality Breakdown, Confidence Stats, Conformal Set, & Abstentions (Col 6/7) */}
            <div className="lg:col-span-6 space-y-6">

              {/* 6. RECORDING QUALITY ANALYSIS */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sora text-base font-bold text-ink-primary">
                      Recording Quality
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Application quality categories (baseline threshold Q &ge; 0.35)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-breath-teal">
                    Avg Q: {avgQ !== null ? avgQ : '—'}
                  </span>
                </div>

                {/* Quality Stat Tiles */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-ink-muted uppercase block font-semibold">Average</span>
                    <span className="font-sora font-bold text-sm text-ink-primary">{avgQ ?? '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Highest</span>
                    <span className="font-sora font-bold text-sm text-breath-teal">{maxQ ?? '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-ink-muted uppercase block font-semibold">Lowest</span>
                    <span className="font-sora font-bold text-sm text-ink-primary">{minQ ?? '—'}</span>
                  </div>
                </div>

                {/* Quality Tier Breakdown */}
                <div className="space-y-2 pt-1 text-xs divide-y divide-slate-100">
                  <div className="pt-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-breath-teal" />
                      <span><strong>Good</strong> (Q &ge; 0.70)</span>
                    </div>
                    <span className="font-mono font-semibold text-ink-primary">{goodQualityCount}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span><strong>Adequate</strong> (0.35 &le; Q &lt; 0.70)</span>
                    </div>
                    <span className="font-mono font-semibold text-ink-primary">{adequateQualityCount}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span><strong>Needs Attention</strong> (Q &lt; 0.35)</span>
                    </div>
                    <span className="font-mono font-semibold text-ink-primary">{needsAttentionCount}</span>
                  </div>
                </div>
              </div>

              {/* 7. MODEL CONFIDENCE ANALYSIS */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sora text-base font-bold text-ink-primary">
                      Model Confidence
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Confidence relative to selective threshold (85.0%)
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-ink-primary">
                    Avg: {avgConf !== null ? `${avgConf}%` : '—'}
                  </span>
                </div>

                {/* Confidence Stat Tiles */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-ink-muted uppercase block font-semibold">Average</span>
                    <span className="font-sora font-bold text-sm text-ink-primary">{avgConf ? `${avgConf}%` : '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Highest</span>
                    <span className="font-sora font-bold text-sm text-breath-teal">{maxConf ? `${maxConf}%` : '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-ink-muted uppercase block font-semibold">Lowest</span>
                    <span className="font-sora font-bold text-sm text-ink-primary">{minConf ? `${minConf}%` : '—'}</span>
                  </div>
                </div>

                {/* Threshold Compliance */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">&ge; 85.0% (Meets Selective Threshold):</span>
                    <span className="font-mono font-bold text-breath-teal">{confAboveThreshold} ({confAbovePct}%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">&lt; 85.0% (Triggers Safety Safeguard):</span>
                    <span className="font-mono font-bold text-signal-coral">{confBelowThreshold}</span>
                  </div>
                </div>
              </div>

              {/* 9. CONFORMAL PREDICTION SET INSIGHT */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-sora text-base font-bold text-ink-primary">
                      Conformal Prediction Set Size
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      Prediction-set composition under calibrated thresholds
                    </p>
                  </div>
                  {avgSetSize && (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-breath-sky-light text-breath-teal">
                      Avg Size: {avgSetSize}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-ink-muted block font-medium">Single Class</span>
                    <span className="font-sora font-bold text-base text-ink-primary">{singleClassSets}</span>
                    <span className="text-[10px] text-ink-secondary block">High certainty</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-ink-muted block font-medium">Multi-Class</span>
                    <span className="font-sora font-bold text-base text-ink-primary">{multiClassSets}</span>
                    <span className="text-[10px] text-ink-secondary block">Plausible subset</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                    <span className="text-[10px] text-ink-muted block font-medium">Empty Set</span>
                    <span className="font-sora font-bold text-base text-ink-primary">{emptySets}</span>
                    <span className="text-[10px] text-ink-secondary block">High nonconformity</span>
                  </div>
                </div>

                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Conformal prediction guarantees that true acoustic classes remain inside the prediction set at the calibrated statistical coverage level.
                </p>
              </div>

              {/* 8. ABSTENTION REASONS */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
                <div>
                  <h2 className="font-sora text-base font-bold text-ink-primary">
                    Why the System Abstained
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Aggregated reasons for safety rejections
                  </p>
                </div>

                {reasonList.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-ink-muted">
                    No abstention reasons recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {reasonList.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-rose-950 truncate max-w-[80%]">
                            {item.reason}
                          </span>
                          <span className="font-mono font-bold text-signal-coral">
                            {item.count}
                          </span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-rose-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-signal-coral transition-all duration-500"
                            style={{
                              width: `${(item.count / maxReasonCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
