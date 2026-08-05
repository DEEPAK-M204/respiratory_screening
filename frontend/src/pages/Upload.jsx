import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WaveformViewer from '../components/WaveformViewer';
import { analyzeRecording } from '../api/client';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setError('');
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a WAV or MP3 file.');

    setLoading(true);
    setError('');
    try {
      const result = await analyzeRecording(file);
      // pass the result forward via route state — simplest option for Phase 1
      navigate('/results', { state: { result } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-12 px-6">
      <h2 className="text-xl font-semibold text-slate-blue mb-4">
        Upload a Breathing Recording
      </h2>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".wav,.mp3"
          onChange={handleFileChange}
          className="mb-4 block"
        />

        {file && (
          <div className="mb-4">
            <WaveformViewer file={file} />
          </div>
        )}

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded-lg text-white font-medium ${
            loading ? 'bg-gray-400' : 'bg-teal-green'
          }`}
        >
          {loading ? 'Analyzing quality...' : 'Analyze Recording'}
        </button>
      </form>
    </div>
  );
}