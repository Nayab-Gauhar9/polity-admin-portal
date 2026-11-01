import axios from 'axios';

const CONTENT_API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://newspaper-upsc-ai.onrender.com';
const CORE_API_URL = (import.meta as any).env?.VITE_CORE_API_URL || 'https://<your-second-render-service-name>.onrender.com';

// Content & newspaper/pyq service
export const apiClient = axios.create({
  baseURL: CONTENT_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// User session, notes, and RAG service
export const coreApiClient = axios.create({
  baseURL: CORE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});