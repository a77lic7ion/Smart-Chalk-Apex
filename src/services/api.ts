import axios from 'axios';

const api = axios.create({
  baseURL: 'https://smart-chalk-apex.vercel.app/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('google_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
