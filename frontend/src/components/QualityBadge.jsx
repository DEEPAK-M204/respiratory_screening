// Patient-friendly badge for recording quality
export default function QualityBadge({ Q, size = 'md', showDot = true }) {
  const numQ = typeof Q === 'number' ? Q : parseFloat(Q || 0);

  let label = 'Good recording';
  let badgeStyle = 'bg-breath-sky-light text-breath-teal border-breath-sky';
  let dotColor = 'bg-breath-teal';

  if (numQ < 0.35) {
    label = 'Needs a retry';
    badgeStyle = 'bg-signal-coral-light text-signal-coral border-signal-coral/20';
    dotColor = 'bg-signal-coral';
  } else if (numQ < 0.6) {
    label = 'Could be clearer';
    badgeStyle = 'bg-caution-amber-light text-[#B87A24] border-caution-amber/20';
    dotColor = 'bg-caution-amber';
  }

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-0.5 text-xs' 
    : 'px-3 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${badgeStyle} ${sizeClasses}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span className="font-medium">{label}</span>
    </span>
  );
}