// Simple traffic-light badge for the quality score — good/borderline/poor.
export default function QualityBadge({ Q }) {
  let label = 'Good';
  let classes = 'bg-teal-green text-white';

  if (Q < 0.35) {
    label = 'Poor — please re-record';
    classes = 'bg-red-500 text-white';
  } else if (Q < 0.6) {
    label = 'Borderline';
    classes = 'bg-yellow-500 text-white';
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${classes}`}>
      {label} (Q = {Q})
    </span>
  );
}