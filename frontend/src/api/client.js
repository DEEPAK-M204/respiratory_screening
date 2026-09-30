import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const API = axios.create({ baseURL: API_BASE_URL });

export function getAudioUploadUrl(filename) {
  if (!filename) return null;
  return `${BACKEND_URL}/uploads/${filename}`;
}

export async function analyzeRecording(file, mode = 'realtime_mic') {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await API.post(`/analyze?mode=${encodeURIComponent(mode)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getHistory() {
  const { data } = await API.get('/history');
  return data;
}

export async function checkHealth() {
  const { data } = await API.get('/health');
  return data;
}

export default API;