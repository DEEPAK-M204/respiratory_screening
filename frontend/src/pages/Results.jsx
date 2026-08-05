import { useLocation, Link } from 'react-router-dom';
import QualityBadge from '../components/QualityBadge';

export default function Results() {
  const { state } = useLocation();
  const result = state?.result;

  if (!result) {
    return (
      <div className="max-w-xl mx-auto mt-12 px-6 text-center">
        <p className="text-gray-500 mb-4">No result to show yet.</p>
        <Link to="/upload" className="text-teal-green underline">
          Upload a recording
        </Link>
      </div>
    );
  }

  const { quality } = result;

  return (
    <div className="max-w-xl mx-auto mt-12 px-6">
      <h2 className="text-xl font-semibold text-slate-blue mb-4">
        Recording Quality Report
      </h2>

      <div className="mb-4">
        <QualityBadge Q={quality.Q} />
      </div>

      <table className="w-full text-sm border-collapse">
        <tbody>
          <tr className="border-b">
            <td className="py-2 text-gray-500">Duration</td>
            <td className="py-2 text-right">{quality.duration_sec}s</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 text-gray-500">Clipping ratio</td>
            <td className="py-2 text-right">{quality.clipping_ratio}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 text-gray-500">Silence ratio</td>
            <td className="py-2 text-right">{quality.silence_ratio}</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 text-gray-500">SNR</td>
            <td className="py-2 text-right">
              {quality.snr_db !== null ? `${quality.snr_db} dB` : 'n/a'}
            </td>
          </tr>
        </tbody>
      </table>

      {!quality.usable && (
        <p className="mt-4 text-red-500">
          This recording did not meet the minimum quality bar. Please
          re-record in a quiet room, holding the phone close to the chest.
        </p>
      )}

      {quality.usable && (
        <p className="mt-4 text-gray-600">
          Recording quality is sufficient. Disease classification will run in
          a later phase, once the CNN+BiLSTM model is trained.
        </p>
      )}

      <Link to="/upload" className="inline-block mt-6 text-teal-green underline">
        Analyze another recording
      </Link>
    </div>
  );
}