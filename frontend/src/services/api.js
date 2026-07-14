import axios from 'axios';

const instance = axios.create({ baseURL: '/api' });

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const api = {
  auth: {
    login: (data) => instance.post('/auth/login', data),
    register: (data) => instance.post('/auth/register', data),
    getProfile: () => instance.get('/auth/profile'),
    updateProfile: (data) => instance.put('/auth/profile', data),
  },
  devices: {
    getAll: (params) => instance.get('/devices', { params }),
    getById: (id) => instance.get(`/devices/${id}`),
    create: (data) => instance.post('/devices', data),
    update: (id, data) => instance.put(`/devices/${id}`, data),
    delete: (id) => instance.delete(`/devices/${id}`),
    getCategories: () => instance.get('/devices/categories'),
  },
  consumption: {
    addReading: (data) => instance.post('/consumption/readings', data),
    getReadings: (params) => instance.get('/consumption/readings', { params }),
    getRealtime: () => instance.get('/consumption/realtime'),
    getSummary: (params) => instance.get('/consumption/summary', { params }),
    getByDevice: (params) => instance.get('/consumption/by-device', { params }),
  },
  invoices: {
    getAll: (params) => instance.get('/invoices', { params }),
    create: (data) => instance.post('/invoices', data),
    getComparison: (params) => instance.get('/invoices/comparison', { params }),
  },
  alerts: {
    getAll: (params) => instance.get('/alerts', { params }),
    getUnreadCount: () => instance.get('/alerts/unread-count'),
    markAsRead: (id) => instance.put(`/alerts/${id}/read`),
    markAllAsRead: () => instance.put('/alerts/read-all'),
    create: (data) => instance.post('/alerts', data),
    delete: (id) => instance.delete(`/alerts/${id}`),
  },
  tariffs: {
    getByProvince: (provinceId) => instance.get(`/tariffs/province/${provinceId}`),
    getAll: (params) => instance.get('/tariffs', { params }),
    create: (data) => instance.post('/tariffs', data),
    getProvinces: () => instance.get('/tariffs/provinces'),
  },
  predictions: {
    getAll: (params) => instance.get('/predictions', { params }),
    generate: (data) => instance.post('/predictions/generate', data),
    getAccuracy: () => instance.get('/predictions/accuracy'),
    detectAnomalies: (params) => instance.get('/predictions/anomalies', { params }),
  },
  dashboard: {
    getOverview: () => instance.get('/dashboard/overview'),
    getDaily: (params) => instance.get('/dashboard/daily', { params }),
    getMonthly: (params) => instance.get('/dashboard/monthly', { params }),
    getDeviceBreakdown: (params) => instance.get('/dashboard/device-breakdown', { params }),
  },
};
