import axios from 'axios';

// Get admin secret token if saved in localStorage
const getAdminSecret = () => {
  return localStorage.getItem('PM_ADMIN_SECRET') || '';
};

// 1. Client for newspaper-upsc-ai backend (Social Automation & ETL services)
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

apiClient.interceptors.request.use((config) => {
  const secret = getAdminSecret();
  if (secret) {
    config.headers['X-Admin-Secret'] = secret;
  }
  return config;
});

// 2. Client for core backend (Reports, Users, PYQs, Articles, Dossiers)
export const coreApiClient = axios.create({
  baseURL: import.meta.env.VITE_CORE_API_URL || 'http://localhost:8000',
});

coreApiClient.interceptors.request.use((config) => {
  const secret = getAdminSecret();
  if (secret) {
    config.headers['X-Admin-Secret'] = secret;
  }
  return config;
});
