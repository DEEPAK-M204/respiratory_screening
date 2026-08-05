import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000/api' });

export async function analyzeRecording(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await API.post('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getHistory() {
  const { data } = await API.get('/history');
  return data;
}

export default API;