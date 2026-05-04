import axios from 'axios';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api/' 
  : 'https://uhc-backend.onrender.com/api/';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000, // 20 seconds — allows Render.com free-tier cold start to wake up
});

// Automatically attach JWT token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle timeout and network errors gracefully (e.g. Render.com cold start)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return Promise.reject({
        ...error,
        response: {
          data: {
            message: 'The server is waking up from sleep — please wait a moment and try again. This only happens after a period of inactivity.'
          },
          status: 503,
        },
      });
    }
    if (!error.response) {
      return Promise.reject({
        ...error,
        response: {
          data: {
            message: 'Cannot reach the server. Please check your connection and try again.'
          },
          status: 0,
        },
      });
    }
    return Promise.reject(error);
  }
);

export default api;
