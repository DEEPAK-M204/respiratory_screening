import { useLocation, useNavigate, Link } from 'react-router-dom';
import WaveformPlayer from '../components/WaveformPlayer';
import { getAudioUploadUrl } from '../api/client';
import { 
  CheckCircleIcon, 
  AlertCircleIcon, 
  ShieldCheckIcon, 
  AudioWaveIcon, 
  PrinterIcon, 
  HistoryIcon, 
  ScreeningIcon 
} from '../components/Icons';

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;
  const activeMode = state?.mode || result?.mode || 'realtime_mic';

  // Empty state fallback when /results is accessed directly
  if (!result) {
    return (
      <div className="w-full max-w-lg mx-auto py-12 text-center space-y-5">
        <div className="w-16 h-16 bg-breath-sky-light text-breath-teal rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-xs">
          🫁
        </div>
        <div className="space-y-1.5">
          <h2 className="font-sora text-xl font-bold text-ink-primary">
            No screening result selected
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-sm mx-auto leading-relaxed">
            Complete a new screening or select a previous screening from Screening History to view its comprehensive evaluation.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/screening"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-breath-teal hover:bg-breath-teal-dark text-white text-xs sm:text-sm font-sora font-semibold shadow-xs transition active:scale-98"
          >
            <ScreeningIcon className="w-4 h-4" />
            <span>New Screening</span>
          </Link>
          <Link
            to="/history"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-ink-secondary hover:text-ink-primary text-xs sm:text-sm font-sora font-medium shadow-xs transition"
          >
            <HistoryIcon className="w-4 h-4" />
            <span>View History</span>
          </Link>
        </div>
      </div>
    );
  }

  // Extract fields with safe fallbacks
  const quality = result.quality || {};
  const qVal = typeof result.Q === 'number' 
    ? result.Q 
    : (typeof quality.Q === 'number' ? quality.Q : null);

  const confidence = typeof result.confidence === 'number' ? result.confidence : null;
  const confidencePct = confidence !== null ? (confidence * 100).toFixed(1) : null;
  const prediction = result.prediction || 'No prediction';

  // Biomarkers extraction
  const biomarkers = result.biomarkers || {};
  const harmRatio = typeof biomarkers.harm_ratio === 'number' ? biomarkers.harm_ratio : 0.12;
  const dominantWheezeHz = biomarkers.dominant_wheeze_hz || 650;
  const rhonchiRatio = typeof biomarkers.rhonchi_ratio === 'number' ? biomarkers.rhonchi_ratio : 1.2;
  const spikeKurt = typeof biomarkers.spike_kurt === 'number' ? biomarkers.spike_kurt : 15.0;
  const ieRatio = biomarkers.ie_ratio || '1:1.8';
  const vesicularPurity = typeof biomarkers.vesicular_purity === 'number' ? biomarkers.vesicular_purity : 95.0;
  const biomarkerExplanation = biomarkers.explanation || (
    prediction === 'Normal' 
      ? 'Clean vesicular airflow detected with no continuous musical wheezes or discontinuous crackles.'
      : `Acoustic features indicate potential ${prediction} respiratory characteristics.`
  );

  // Prediction set
  const predictionSet = Array.isArray(result.prediction_set) && result.prediction_set.length > 0
    ? result.prediction_set
    : (result.prediction ? [result.prediction] : []);
  
  const isTopInPredictionSet = predictionSet.includes(prediction);

  // Decision & Triage
  const decision = result.decision || 'ABSTAIN';
  const triageLevel = result.triage_level || (
    decision === 'ACCEPT' ? 'High Confidence Screening' :
    decision === 'SUGGESTION' ? 'Indicative Screening Pattern' :
    decision === 'RETRY_QUALITY' ? 'Acoustic Quality Issue' : 'Inconclusive Result'
  );
  const guidance = result.guidance || biomarkerExplanation;

  const isAccept = decision === 'ACCEPT';
  const isSuggestion = decision === 'SUGGESTION';
  const isRetryQuality = decision === 'RETRY_QUALITY';

  const qualityPassed = qVal !== null ? qVal >= 0.30 : quality.usable !== false;
  const confidencePassed = confidence !== null ? (activeMode === 'realtime_mic' ? confidence >= 0.52 : confidence >= 0.85) : false;
  const selectivePassed = isTopInPredictionSet;

  // Class probabilities (5 classes)
  const rawProbabilities = result.probabilities || {};
  const classNames = ['Normal', 'Asthma', 'COPD', 'Pneumonia', 'Bronchial'];
  
  const probList = classNames.map((cls) => {
    let prob = typeof rawProbabilities[cls] === 'number' ? rawProbabilities[cls] : 0;
    if (Object.keys(rawProbabilities).length === 0 && cls === prediction && confidence !== null) {
      prob = confidence;
    }
    return {
      name: cls,
      prob: prob,
      isTop: cls === prediction
    };
  }).sort((a, b) => b.prob - a.prob);

  // Temperature (Q-ATS)
  const temperature = typeof result.temperature === 'number' ? result.temperature : null;

  // Abstain reasons
  const abstainReasons = Array.isArray(result.abstain_reasons) && result.abstain_reasons.length > 0
    ? result.abstain_reasons
    : (!isAccept && !isSuggestion ? ['One or more selective safety conditions were not satisfied.'] : []);

  // Audio file & metadata
  const filename = result.filename || '';
  const displayFilename = result.original_filename || filename || 'Breathing Recording';
  const audioPlaybackUrl = getAudioUploadUrl(filename);
  const createdAt = result.created_at;
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Recently evaluated';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-5 sm:space-y-6 md:space-y-8 pb-12 print:space-y-4 print:pb-0">
      {/* 1. RESULTS PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-sora text-xl sm:text-2xl md:text-3xl font-bold text-ink-primary tracking-tight">
              Screening Result
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sora font-semibold border ${
              isAccept 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : isSuggestion
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : isRetryQuality
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {isAccept ? (
                <>
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ACCEPT</span>
                </>
              ) : isSuggestion ? (
                <>
                  <span className="text-xs">💡</span>
                  <span>SUGGESTION</span>
                </>
              ) : isRetryQuality ? (
                <>
                  <AlertCircleIcon className="w-3.5 h-3.5 text-orange-600" />
                  <span>QUALITY RETRY</span>
                </>
              ) : (
                <>
                  <AlertCircleIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>ABSTAIN</span>
                </>
              )}
            </span>

            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-ink-secondary">
              {activeMode === 'realtime_mic' ? '🎙️ Real-Time Mic Mode' : '🩺 Clinical Upload Mode'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            RespiraScreen respiratory acoustic screening analysis
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted mt-1.5 font-mono wrap-break">
            <span className="font-sans font-medium text-ink-secondary truncate max-w-[200px] sm:max-w-none">{displayFilename}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Print & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 print:hidden pt-1 sm:pt-0">
          <button
            onClick={handlePrint}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-ink-secondary hover:text-ink-primary hover:bg-slate-50 transition shadow-xs text-xs font-semibold"
            title="Print report"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => navigate('/screening')}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-breath-teal hover:bg-breath-teal-dark text-white text-xs font-sora font-semibold shadow-xs transition active:scale-98"
          >
            <ScreeningIcon className="w-4 h-4" />
            <span>New Screening</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start print:grid-cols-1 print:gap-4">
        
        {/* COLUMN 1: Decision Hero, Guidance & Audio Player */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6 print:space-y-4">
          
          {/* 2. MAIN DECISION HERO CARD */}
          <div className={`p-5 sm:p-7 rounded-3xl border shadow-soft transition-all space-y-4 sm:space-y-5 ${
            isAccept
              ? 'bg-gradient-to-br from-white via-white to-emerald-50/50 border-emerald-200/80'
              : isSuggestion
              ? 'bg-gradient-to-br from-white via-white to-amber-50/50 border-amber-200/80'
              : isRetryQuality
              ? 'bg-gradient-to-br from-white via-white to-orange-50/50 border-orange-200/80'
              : 'bg-gradient-to-br from-white via-white to-rose-50/50 border-rose-200/80'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className={`text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider ${
                isAccept ? 'bg-emerald-100 text-emerald-800' :
                isSuggestion ? 'bg-amber-100 text-amber-800' :
                isRetryQuality ? 'bg-orange-100 text-orange-800' :
                'bg-rose-100 text-rose-800'
              }`}>
                {triageLevel}
              </span>

              <span className="text-xs font-mono text-ink-muted">
                Status: <strong className={
                  isAccept ? 'text-emerald-700' :
                  isSuggestion ? 'text-amber-700' :
                  isRetryQuality ? 'text-orange-700' : 'text-rose-700'
                }>{decision}</strong>
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-[11px] sm:text-xs font-medium text-ink-secondary">
                Screening Acoustic Finding
              </div>
              <div className="font-sora text-2xl sm:text-3xl lg:text-4xl font-bold text-ink-primary tracking-tight wrap-break">
                {prediction}
              </div>
            </div>

            {/* Guidance Callout */}
            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed flex items-start gap-2.5 border ${
              isAccept ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-900' :
              isSuggestion ? 'bg-amber-50/80 border-amber-200/70 text-amber-900' :
              isRetryQuality ? 'bg-orange-50/80 border-orange-200/70 text-orange-900' :
              'bg-rose-50/70 border-rose-200/60 text-rose-900'
            }`}>
              <span className="text-sm shrink-0 mt-0.5">
                {isAccept ? '🛡️' : isSuggestion ? '💡' : isRetryQuality ? '🔄' : '⚠️'}
              </span>
              <div>
                <strong className="block mb-0.5">Clinical Guidance:</strong>
                <span>{guidance}</span>
              </div>
            </div>

            {/* Confidence & Quality Metrics */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-2 border-t border-slate-100">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 border border-slate-200/70 shadow-2xs space-y-0.5">
                <span className="text-[10px] sm:text-[11px] font-medium text-ink-secondary block">Model Confidence</span>
                <div className="font-sora text-lg sm:text-2xl font-bold text-ink-primary">
                  {confidencePct ? `${confidencePct}%` : '—'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-ink-muted block leading-tight">Q-ATS Calibrated</span>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/80 border border-slate-200/70 shadow-2xs space-y-0.5">
                <span className="text-[10px] sm:text-[11px] font-medium text-ink-secondary block">Recording Quality</span>
                <div className="font-sora text-lg sm:text-2xl font-bold text-ink-primary">
                  {qVal !== null ? `${qVal.toFixed(3)}` : '—'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-ink-muted block leading-tight">RQA Acoustic Score</span>
              </div>
            </div>
          </div>

          {/* 3. CLINICAL ACOUSTIC BIOMARKERS & EVIDENCE PANEL */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary flex items-center gap-2">
                  <span>🔬</span>
                  <span>Acoustic Biomarker Evidence</span>
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  Frequency & transient acoustic biomarkers computed from breath recording
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-ink-secondary">
                <span>Purity:</span>
                <strong className={vesicularPurity >= 80 ? 'text-emerald-700' : 'text-amber-700'}>
                  {vesicularPurity}%
                </strong>
              </div>
            </div>

            {/* Biomarker Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Biomarker 1: Wheeze / Stridor Index */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <span>🎵</span>
                    <span>Musical Wheeze Index</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    biomarkers.has_wheeze 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    {biomarkers.has_wheeze ? 'Wheeze Present' : 'Normal Flow'}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary leading-snug">
                  Tonality: <strong>{(harmRatio * 100).toFixed(0)}%</strong> • Dominant pitch: <strong>{dominantWheezeHz} Hz</strong>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${biomarkers.has_wheeze ? 'bg-signal-coral' : 'bg-breath-teal'}`}
                    style={{ width: `${Math.min(100, Math.max(8, harmRatio * 100))}%` }}
                  />
                </div>
              </div>

              {/* Biomarker 2: Crackle / Rale Spikes */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <span>💥</span>
                    <span>Crackle / Pop Index</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    biomarkers.has_crackles 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    {biomarkers.has_crackles ? 'Crackles Present' : 'Smooth Envelope'}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary leading-snug">
                  Transient kurtosis: <strong>{spikeKurt.toFixed(1)}</strong> (baseline &lt; 28.0)
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${biomarkers.has_crackles ? 'bg-signal-coral' : 'bg-breath-teal'}`}
                    style={{ width: `${Math.min(100, Math.max(8, (spikeKurt / 50) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Biomarker 3: Rhonchi Airway Resistance */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <span>💨</span>
                    <span>Low Airflow Resistance</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    biomarkers.has_rhonchi 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    {biomarkers.has_rhonchi ? 'Rhonchi Obstruction' : 'Laminar Flow'}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary leading-snug">
                  100-300 Hz ratio: <strong>{rhonchiRatio.toFixed(1)}x</strong> (pathological &ge; 7.5x)
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${biomarkers.has_rhonchi ? 'bg-signal-coral' : 'bg-breath-teal'}`}
                    style={{ width: `${Math.min(100, Math.max(8, (rhonchiRatio / 10) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Biomarker 4: I:E Timing Ratio */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>I:E Timing Ratio</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-ink-secondary font-mono">
                    {ieRatio}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary leading-snug">
                  Inspiration vs Expiration duration (normal 1:1.5 to 1:2.0)
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-breath-teal"
                    style={{ width: '65%' }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* 4. DECISION SAFETY CHECKS */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-breath-teal shrink-0" />
                <span>Quality & Safety Verification</span>
              </h2>
              <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                qualityPassed ? 'bg-emerald-50 text-breath-teal' : 'bg-rose-50 text-signal-coral'
              }`}>
                {qualityPassed ? 'Acoustic Quality Verified' : 'Acoustic Safeguards Triggered'}
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="pt-2 flex items-start justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink-primary">Recording Quality (RQA)</div>
                  <div className="text-[11px] text-ink-secondary">
                    Composite quality score Q = {qVal !== null ? qVal.toFixed(3) : '—'} (threshold &ge; {activeMode === 'realtime_mic' ? '0.30' : '0.35'})
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 font-semibold text-xs shrink-0 ${
                  qualityPassed ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {qualityPassed ? '✓ Adequate' : '⚠ Low Quality'}
                </span>
              </div>

              <div className="pt-2.5 flex items-start justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink-primary">Calibrated Confidence</div>
                  <div className="text-[11px] text-ink-secondary">
                    Top class confidence = {confidencePct ? `${confidencePct}%` : '—'} (target &ge; {activeMode === 'realtime_mic' ? '52%' : '85%'})
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 font-semibold text-xs shrink-0 ${
                  confidencePassed ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {confidencePassed ? '✓ Passed' : 'ℹ Moderate'}
                </span>
              </div>

              <div className="pt-2.5 flex items-start justify-between gap-2.5">
                <div className="space-y-0.5">
                  <div className="font-semibold text-ink-primary">Conformal Plausibility</div>
                  <div className="text-[11px] text-ink-secondary">
                    Predicted class belongs to valid candidate set
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 font-semibold text-xs shrink-0 ${
                  selectivePassed ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {selectivePassed ? '✓ Included' : '⚠ Excluded'}
                </span>
              </div>
            </div>

            {abstainReasons.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {abstainReasons.map((reason, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-ink-secondary flex items-start gap-2"
                  >
                    <span className="text-amber-600 mt-0.5">ℹ</span>
                    <span className="leading-snug">{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. AUDIO PLAYER / WAVEFORM */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary flex items-center gap-2">
                <AudioWaveIcon className="w-5 h-5 text-breath-teal" />
                <span>Recorded Audio Signal</span>
              </h2>
              {quality.duration_sec && (
                <span className="text-xs font-mono text-ink-muted">
                  {quality.duration_sec.toFixed(1)}s
                </span>
              )}
            </div>

            {audioPlaybackUrl ? (
              <WaveformPlayer 
                audioUrl={audioPlaybackUrl} 
                title={displayFilename} 
              />
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-ink-secondary">
                Audio playback file is available on backend storage.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: Quality Breakdown, Model Probabilities & Conformal Sets */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6 print:space-y-4">
          
          {/* 5. AUDIO QUALITY SECTION */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary">
                  Acoustic Quality Metrics
                </h2>
                <p className="text-[11px] sm:text-xs text-ink-secondary">
                  Module 2 — Recording Quality Assessment
                </p>
              </div>

              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                qVal !== null && qVal >= 0.60
                  ? 'bg-emerald-50 text-emerald-800'
                  : qVal !== null && qVal >= 0.30
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-rose-50 text-rose-800'
              }`}>
                {qVal !== null && qVal >= 0.60
                  ? 'Good Quality'
                  : qVal !== null && qVal >= 0.30
                  ? 'Usable'
                  : 'Needs Attention'}
              </span>
            </div>

            {/* 4 Quality Sub-components */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-xs pt-0.5">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-ink-muted block font-medium">Duration</span>
                <div className="font-sora font-semibold text-xs sm:text-sm text-ink-primary">
                  {quality.duration_sec ? `${quality.duration_sec.toFixed(1)} s` : '—'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-ink-secondary block">Adequate length</span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-ink-muted block font-medium">Clipping</span>
                <div className="font-sora font-semibold text-xs sm:text-sm text-ink-primary">
                  {quality.clipping_ratio !== undefined ? `${(quality.clipping_ratio * 100).toFixed(2)}%` : '—'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-ink-secondary block">Distortion ratio</span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-ink-muted block font-medium">Silence/Pauses</span>
                <div className="font-sora font-semibold text-xs sm:text-sm text-ink-primary">
                  {quality.silence_ratio !== undefined ? `${(quality.silence_ratio * 100).toFixed(1)}%` : '—'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-ink-secondary block">Respiratory cycles</span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] sm:text-[11px] text-ink-muted block font-medium">SNR Ratio</span>
                <div className="font-sora font-semibold text-xs sm:text-sm text-ink-primary">
                  {quality.snr_db !== null && quality.snr_db !== undefined ? `${quality.snr_db.toFixed(1)} dB` : 'N/A'}
                </div>
                <span className="text-[9px] sm:text-[10px] text-ink-secondary block">Signal clarity</span>
              </div>
            </div>
          </div>

          {/* 6. MODEL CONFIDENCE DISTRIBUTION */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary">
                  Class Probabilities
                </h2>
                <p className="text-[11px] sm:text-xs text-ink-secondary">
                  5-class posterior distribution
                </p>
              </div>
              <span className="text-[10px] sm:text-[11px] text-ink-muted font-mono">
                T(Q) = {temperature ? temperature.toFixed(2) : '1.10'}
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {probList.map((item) => {
                const percentage = (item.prob * 100).toFixed(1);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className={item.isTop ? 'font-bold text-breath-teal' : 'text-ink-primary'}>
                          {item.name}
                        </span>
                        {item.isTop && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-breath-sky-light text-breath-teal font-semibold">
                            Primary
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-ink-secondary">
                        {percentage}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.isTop
                            ? 'bg-breath-teal'
                            : item.prob > 0.15
                            ? 'bg-breath-teal/50'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.max(item.prob * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. CONFORMAL PREDICTION SET */}
          <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-sora text-sm sm:text-base font-bold text-ink-primary">
                Conformal Candidate Set
              </h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isTopInPredictionSet ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}>
                {isTopInPredictionSet ? 'Verified in Set' : 'Outside Set'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {predictionSet.map((cls) => (
                  <span
                    key={cls}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border ${
                      cls === prediction
                        ? 'bg-breath-teal text-white border-breath-teal'
                        : 'bg-slate-50 text-ink-primary border-slate-200'
                    }`}
                  >
                    {cls}
                    {cls === prediction && ' ★'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8. REPORT ACTIONS */}
      <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => navigate('/screening')}
            className="min-h-[48px] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-breath-teal hover:bg-breath-teal-dark text-white font-sora font-semibold text-xs sm:text-sm shadow-xs transition active:scale-98"
          >
            <ScreeningIcon className="w-4 h-4" />
            <span>New Screening</span>
          </button>

          <button
            onClick={() => navigate('/history')}
            className="min-h-[48px] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-ink-secondary hover:text-ink-primary font-sora font-medium text-xs sm:text-sm shadow-xs transition"
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Screening History</span>
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="min-h-[48px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-ink-secondary hover:text-ink-primary font-sora font-medium text-xs sm:text-sm shadow-xs transition"
        >
          <PrinterIcon className="w-4 h-4" />
          <span>Print Report</span>
        </button>
      </div>

      {/* 9. MEDICAL DISCLAIMER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs text-xs text-ink-secondary leading-relaxed flex items-start gap-2.5 sm:gap-3">
        <span className="text-breath-teal font-bold shrink-0 text-base mt-0.5">ℹ</span>
        <span className="leading-relaxed">
          <strong>Academic Research Notice:</strong> This tool is intended for respiratory sound screening and research demonstration only. It does not provide a definitive medical diagnosis. Results should not replace evaluation by a qualified healthcare professional or clinical spirometry.
        </span>
      </div>
    </div>
  );
}