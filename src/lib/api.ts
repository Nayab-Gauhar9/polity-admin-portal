import axios, { InternalAxiosRequestConfig } from 'axios';

// Base URLs resolved from Vite environment variables with production fallbacks
const CONTENT_API_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'https://newspaper-upsc-ai.onrender.com';
const CORE_API_URL =
  (import.meta as any).env?.VITE_CORE_API_URL || 'https://upsc-ai-backend-9vnt.onrender.com';

/**
 * Client for Scraper ETL runs, vector search, and MinIO content assets
 */
export const apiClient = axios.create({
  baseURL: CONTENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Client for Core App services:
 * - Admin Authentication (/api/admin/login)
 * - User Sessions & Candidate Telemetry
 * - Living Dossiers & Perspectives Graph
 * - Articles & Comparative Matrices
 * - Question Reports & Audit Logs
 * - Prelims PYQ Bank
 */
export const coreApiClient = axios.create({
  baseURL: CORE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor: Automatically injects the stored admin secret key
 * into the X-Admin-Secret-Key header for all outbound admin requests.
 */
const injectAdminSecret = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const secretKey =
    typeof window !== 'undefined'
      ? localStorage.getItem('PM_ADMIN_SECRET') || (import.meta as any).env?.VITE_ADMIN_SECRET
      : undefined;

  if (secretKey && config.headers) {
    config.headers['X-Admin-Secret-Key'] = secretKey;
  }
  return config;
};

apiClient.interceptors.request.use(injectAdminSecret, (error) => Promise.reject(error));
coreApiClient.interceptors.request.use(injectAdminSecret, (error) => Promise.reject(error));

/**
 * Response Interceptor: If any administrative endpoint rejects the token
 * with 401 Unauthorized or 403 Forbidden, automatically clear the invalid
 * local session so App.tsx can bounce back to the Login Screen.
 */
const handleAuthRejection = (error: any) => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    // Avoid clearing during login endpoint checks
    if (!error.config?.url?.includes('/api/admin/login')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('PM_ADMIN_SECRET');
        window.location.reload();
      }
    }
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use((response) => response, handleAuthRejection);
coreApiClient.interceptors.response.use((response) => response, handleAuthRejection);