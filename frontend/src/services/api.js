import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 second timeout
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error
    if (!error.response) {
      console.error('Network Error:', error.message);
      const networkError = new Error('Unable to connect to server. Please check your internet connection.');
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    // Handle authentication errors
    if (error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(new Error('Session expired. Please login again.'));
    }

    // Handle server errors
    if (error.response.status >= 500) {
      console.error('Server Error:', error.response.data);
      return Promise.reject(
        new Error('Server error. Please try again later or contact support.')
      );
    }

    // Handle validation errors
    if (error.response.status === 400) {
      const message = error.response.data?.error || 
                     error.response.data?.message || 
                     'Invalid request. Please check your input.';
      return Promise.reject(new Error(message));
    }

    // Handle rate limiting
    if (error.response.status === 429) {
      return Promise.reject(
        new Error('Too many requests. Please wait a moment and try again.')
      );
    }

    // Default error handling
    const message = error.response.data?.error || 
                   error.response.data?.message || 
                   'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// Auth APIs
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/profile');
  return response.data.user;
};

// Issuer APIs
export const issueCredits = async (data) => {
  const response = await api.post('/issuer/issue', data);
  return response.data;
};

export const getBeneficiaries = async () => {
  const response = await api.get('/issuer/beneficiaries');
  return response.data.beneficiaries;
};

export const getIssuerStats = async () => {
  const response = await api.get('/issuer/stats');
  return response.data;
};

// Beneficiary APIs
export const getBalance = async () => {
  const response = await api.get('/beneficiary/balance');
  return response.data;
};

export const transferToSchool = async (data) => {
  const response = await api.post('/beneficiary/transfer', data);
  return response.data;
};

export const getSchools = async () => {
  const response = await api.get('/beneficiary/schools');
  return response.data.schools;
};

export const getBeneficiaryTransactions = async () => {
  const response = await api.get('/beneficiary/transactions');
  return response.data.transactions;
};

// School APIs
export const getSchoolBalance = async () => {
  const response = await api.get('/school/balance');
  return response.data;
};

export const redeemCredits = async (data) => {
  const response = await api.post('/school/redeem', data);
  return response.data;
};

export const getPendingTransactions = async () => {
  const response = await api.get('/school/pending');
  return response.data.pendingTransactions;
};

export const getRedemptions = async () => {
  const response = await api.get('/school/redemptions');
  return response.data.redemptions;
};

export const getSchoolStats = async () => {
  const response = await api.get('/school/stats');
  return response.data;
};

// Transaction APIs
export const getTransactions = async (type = null) => {
  const params = type ? { type } : {};
  const response = await api.get('/transactions', { params });
  return response.data.transactions;
};

export const getTransactionDetails = async (id) => {
  const response = await api.get(`/transactions/${id}`);
  return response.data.transaction;
};

export default api;
