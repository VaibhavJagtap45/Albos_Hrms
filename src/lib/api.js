// import axios from 'axios';

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// const api = axios.create({
//   baseURL: API_BASE,
//   withCredentials: true,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// api.interceptors.request.use((config) => {
//   if (typeof window !== 'undefined') {
//     const token = localStorage.getItem('hrms_token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//   }
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const shouldRedirect =
//       error.response?.status === 401 &&
//       typeof window !== 'undefined' &&
//       !error.config?.skipAuthRedirect &&
//       window.location.pathname !== '/login';

//     if (shouldRedirect) {
//       localStorage.removeItem('hrms_token');
//       localStorage.removeItem('hrms_user');
//       window.location.href = '/login';
//     }

//     return Promise.reject(error);
//   },
// );

// function createMultipartRequest(path, file) {
//   const form = new FormData();
//   form.append('file', file);
//   return api.post(path, form, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//   });
// }

// export const authAPI = {
//   login: (identifier, password) =>
//     api.post(
//       '/auth/login',
//       identifier.includes('@') ? { email: identifier, password } : { employeeId: identifier, password },
//     ),
//   getMe: () => api.get('/auth/me', { skipAuthRedirect: true }),
//   updateMe: (data) => api.put('/auth/me', data),
//   changePassword: (currentPassword, newPassword) =>
//     api.post('/auth/change-password', { currentPassword, newPassword }),
//   logout: () => api.post('/auth/logout'),
// };

// export const employeeAPI = {
//   list: (params) => api.get('/employees', { params }),
//   get: (id) => api.get(`/employees/${id}`),
//   create: (data) => api.post('/employees', data),
//   update: (id, data) => api.put(`/employees/${id}`, data),
//   delete: (id) => api.delete(`/employees/${id}`),
//   departments: () => api.get('/employees/departments'),
//   stats: () => api.get('/employees/stats'),
//   getMe: () => api.get('/employees/me'),
// };

// export const attendanceAPI = {
//   list: (params) => api.get('/attendance', { params }),
//   getMyMonth: (month, year) => api.get(`/attendance/my/${month}/${year}`),
//   create: (data) => api.post('/attendance', data),
//   update: (id, data) => api.put(`/attendance/${id}`, data),
//   delete: (id) => api.delete(`/attendance/${id}`),
//   addManual: (data) => api.post('/attendance/manual', data),
//   bulkUpload: (file) => createMultipartRequest('/attendance/bulk-upload', file),
//   importCsv: (file) => createMultipartRequest('/attendance/import-csv', file),
//   monthlyUpload: (file) => createMultipartRequest('/attendance/monthly-upload', file),
//   importLogs: () => api.get('/attendance/import-logs'),
//   daily: (params) => api.get('/attendance/daily', { params }),
//   history: (employeeId, params) => api.get(`/attendance/history/${employeeId}`, { params }),
//   stats: () => api.get('/attendance/stats'),
// };

// export const leaveAPI = {
//   list: (params) => api.get('/leaves', { params }),
//   my: () => api.get('/leaves/my'),
//   apply: (data) => api.post('/leaves', data),
//   approve: (id, comment) => api.put(`/leaves/${id}/approve`, { comment }),
//   reject: (id, comment) => api.put(`/leaves/${id}/reject`, { comment }),
//   cancel: (id) => api.delete(`/leaves/${id}`),
// };

// export const payrollAPI = {
//   generate: (data) => api.post('/payroll/generate', data),
//   list: (params) => api.get('/payroll', { params }),
//   update: (id, data) => api.put(`/payroll/${id}`, data),
//   finalise: (id) => api.put(`/payroll/${id}/finalise`),
//   my: (month, year) => api.get(`/payroll/my/${month}/${year}`),
// };

// export const noticeAPI = {
//   list: () => api.get('/notices'),
//   create: (data) => api.post('/notices', data),
//   delete: (id) => api.delete(`/notices/${id}`),
//   my: () => api.get('/notices/my'),
//   markRead: (id) => api.put(`/notices/${id}/read`),
// };

// export const holidayAPI = {
//   list: (params) => api.get('/holidays', { params }),
//   create: (data) => api.post('/holidays', data),
//   update: (id, data) => api.put(`/holidays/${id}`, data),
//   delete: (id) => api.delete(`/holidays/${id}`),
// };

// export default api;

import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("hrms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const shouldRedirect =
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !error.config?.skipAuthRedirect &&
      window.location.pathname !== "/login";

    if (shouldRedirect) {
      localStorage.removeItem("hrms_token");
      localStorage.removeItem("hrms_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

function createMultipartRequest(path, file) {
  const form = new FormData();
  form.append("file", file);
  return api.post(path, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export const authAPI = {
  login: (identifier, password) =>
    api.post(
      "/auth/login",
      identifier.includes("@")
        ? { email: identifier, password }
        : { employeeId: identifier, password },
    ),
  getMe: () => api.get("/auth/me", { skipAuthRedirect: true }),
  updateMe: (data) => api.put("/auth/me", data),
  changePassword: (currentPassword, newPassword) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  forgotPassword: (identifier) =>
    api.post("/auth/forgot-password", { identifier }),
  resetPassword: (token, password) =>
    api.post("/auth/reset-password", { token, password }),
  sendOtp: (identifier) =>
    api.post("/auth/send-otp", { identifier }),
  verifyOtp: (identifier, otp) =>
    api.post("/auth/verify-otp", { identifier, otp }),
  resetPasswordOtp: (verifiedToken, password) =>
    api.post("/auth/reset-password-otp", { verifiedToken, password }),
  logout: () => api.post("/auth/logout"),
};

export const employeeAPI = {
  list: (params) => api.get("/employees", { params }),
  get: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post("/employees", data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  departments: () => api.get("/employees/departments"),
  stats: () => api.get("/employees/stats"),
  getMe: () => api.get("/employees/me"),
  bulkUpload: (file) => createMultipartRequest("/employees/bulk-upload", file),
  resetPassword: (id, password) => api.post(`/employees/${id}/reset-password`, { password }),
};

export const attendanceAPI = {
  list: (params) => api.get("/attendance", { params }),
  getMyMonth: (month, year) => api.get(`/attendance/my/${month}/${year}`),
  create: (data) => api.post("/attendance", data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  addManual: (data) => api.post("/attendance/manual", data),
  bulkUpload: (file) => createMultipartRequest("/attendance/bulk-upload", file),
  importCsv: (file) => createMultipartRequest("/attendance/import-csv", file),
  monthlyUpload: (file, month, year) => {
    const form = new FormData();
    form.append("file", file);
    form.append("month", String(month));
    form.append("year", String(year));
    return api.post("/attendance/monthly-upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  importLogs: () => api.get("/attendance/import-logs"),
  daily: (params) => api.get("/attendance/daily", { params }),
  history: (employeeId, params) =>
    api.get(`/attendance/history/${employeeId}`, { params }),
  stats: () => api.get("/attendance/stats"),
  dailyUpload: (file) =>
    createMultipartRequest("/attendance/daily-upload", file),
  // Correction requests
  submitCorrectionRequest: (data) =>
    api.post("/attendance/correction-requests", data),
  getMyCorrectionRequests: (params) =>
    api.get("/attendance/correction-requests/my", { params }),
  listCorrectionRequests: (params) =>
    api.get("/attendance/correction-requests", { params }),
  approveCorrectionRequest: (id, hrComment) =>
    api.put(`/attendance/correction-requests/${id}/approve`, { hrComment }),
  rejectCorrectionRequest: (id, hrComment) =>
    api.put(`/attendance/correction-requests/${id}/reject`, { hrComment }),
};

export const leaveAPI = {
  list: (params) => api.get("/leaves", { params }),
  my: () => api.get("/leaves/my"),
  apply: (data) => api.post("/leaves", data),
  approve: (id, comment) => api.put(`/leaves/${id}/approve`, { comment }),
  reject: (id, comment) => api.put(`/leaves/${id}/reject`, { comment }),
  cancel: (id) => api.delete(`/leaves/${id}`),
};

export const payrollAPI = {
  generate: (data) => api.post("/payroll/generate", data),
  attendanceCheck: (month, year) => api.get("/payroll/attendance-check", { params: { month, year } }),
  list: (params) => api.get("/payroll", { params }),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  finalise: (id) => api.put(`/payroll/${id}/finalise`),
  my: (month, year) => api.get(`/payroll/my/${month}/${year}`),
};

export const noticeAPI = {
  list: () => api.get("/notices"),
  create: (data) => api.post("/notices", data),
  delete: (id) => api.delete(`/notices/${id}`),
  my: () => api.get("/notices/my"),
  markRead: (id) => api.put(`/notices/${id}/read`),
};

export const holidayAPI = {
  list: (params) => api.get("/holidays", { params }),
  create: (data) => api.post("/holidays", data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

export default api;
