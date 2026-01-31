import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
