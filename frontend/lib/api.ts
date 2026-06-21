import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use(
  (config) => {
    // Check if we are in the browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors (optional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      // window.location.href = '/login'; // Use with caution
    }
    return Promise.reject(error);
  }
);

// Helper for other components expecting authFetch
export const authFetch = async (url: string, options: any = {}) => {
  const { method = 'GET', body, ...rest } = options;
  const response = await api({
    url,
    method,
    data: body,
    ...rest
  });
  return response.data;
};

// Explicit named export
export { api };

// Default export
export default api;
