import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto mt-16 px-6 text-center">
      <h1 className="text-3xl font-bold text-slate-blue mb-3">
        🫁 Safety-Aware Respiratory Sound Screening
      </h1>
      <p className="text-gray-600 mb-6">
        Record or upload a breathing sound. The system checks whether the
        recording quality is good enough for screening before any AI analysis.
      </p>
      <p className="text-sm text-gray-400 mb-8">
        This is an AI-assisted screening aid only — it does not replace a
        medical diagnosis. Always consult a doctor for clinical evaluation.
      </p>
      <Link
        to="/upload"
        className="bg-teal-green text-white px-6 py-3 rounded-lg font-medium"
      >
        Start Screening
      </Link>
    </div>
  );
}