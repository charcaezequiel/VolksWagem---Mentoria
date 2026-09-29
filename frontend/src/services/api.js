import axios from 'axios';

const instance = axios.create({ baseURL: '/api' });

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = localStorage.getItem('lang') || 'es';
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
    getReadings: (id, params) => instance.get(`/devices/${id}/readings`, { params }),
    regenerateToken: (id) => instance.post(`/devices/${id}/regenerate-token`),
  },
  appliances: {
    getAll: () => instance.get('/appliances'),
    getByCategory: () => instance.get('/appliances/by-category'),
  },
  consumption: {
    addReading: (data) => instance.post('/consumption/readings', data),
    getReadings: (params) => instance.get('/consumption/readings', { params }),
    getRealtime: () => instance.get('/consumption/realtime'),
    getLive: () => instance.get('/consumption/live'),
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
    estimate: (provinceId, kwh, subsidy = 'N1') => instance.get('/tariffs/estimate', { params: { province_id: provinceId, kwh, subsidy } }),
  },
  predictions: {
    getAll: (params) => instance.get('/predictions', { params }),
    generate: (data) => instance.post('/predictions/generate', data),
    getAccuracy: () => instance.get('/predictions/accuracy'),
    detectAnomalies: (params) => instance.get('/predictions/anomalies', { params }),
    getBillForecast: () => instance.get('/predictions/bill-forecast'),
  },
  dashboard: {
    getOverview: () => instance.get('/dashboard/overview'),
    getDaily: (params) => instance.get('/dashboard/daily', { params }),
    getMonthly: (params) => instance.get('/dashboard/monthly', { params }),
    getDeviceBreakdown: (params) => instance.get('/dashboard/device-breakdown', { params }),
  },
  ai: {
    getStatus: () => instance.get('/ai/status'),
    getInsights: () => instance.get('/ai/insights'),
    getRecommendations: () => instance.get('/ai/recommendations'),
    generateRecommendations: (force) => instance.post('/ai/recommendations/generate', null, { params: { force } }),
    updateRecommendation: (id, data) => instance.put(`/ai/recommendations/${id}`, data),
    deleteRecommendation: (id) => instance.delete(`/ai/recommendations/${id}`),
    chat: (data) => instance.post('/ai/chat', data),
  },
  sensor: {
    addReading: (data) => instance.post('/sensor/readings', data),
  },
  /* Panel de administracion. El backend responde 403 a cualquier request sin
     role === 'admin', asi que no hace falta chequeos aqui: la UI solo decide
     que mostrar, la autorizacion real esta en el servidor. */
  admin: {
    getStats: () => instance.get('/admin/stats'),
    getConsumption: (params) => instance.get('/admin/consumption', { params }),
    getConsumptionByProvince: (params) => instance.get('/admin/consumption/by-province', { params }),
    getAlerts: (params) => instance.get('/admin/alerts', { params }),

    getUsers: (params) => instance.get('/admin/users', { params }),
    getUser: (id) => instance.get(`/admin/users/${id}`),
    createUser: (data) => instance.post('/admin/users', data),
    updateUser: (id, data) => instance.put(`/admin/users/${id}`, data),

    getTariffs: (params) => instance.get('/admin/tariffs', { params }),
    bulkUploadTariffs: (data) => instance.post('/admin/tariffs/bulk', data),
    updateTariff: (id, data) => instance.put(`/admin/tariffs/${id}`, data),
    deleteTariff: (id) => instance.delete(`/admin/tariffs/${id}`),

    getCategories: () => instance.get('/admin/categories'),
    createCategory: (data) => instance.post('/admin/categories', data),
    updateCategory: (id, data) => instance.put(`/admin/categories/${id}`, data),
    deleteCategory: (id) => instance.delete(`/admin/categories/${id}`),

    createAppliance: (data) => instance.post('/admin/appliances', data),
    deleteAppliance: (id) => instance.delete(`/admin/appliances/${id}`),

    createDevice: (data) => instance.post('/admin/devices', data),
    updateDevice: (id, data) => instance.put(`/admin/devices/${id}`, data),
    rotateDeviceToken: (id) => instance.post(`/admin/devices/${id}/rotate-token`),

    getAiConfig: () => instance.get('/admin/ai-config'),
    updateAiConfig: (data) => instance.put('/admin/ai-config', data),
    resetAiConfig: () => instance.post('/admin/ai-config/reset'),
  },
};
