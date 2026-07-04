const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  },
  users: {
    getAll: () => request('/users'),
    create: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (pin: string, data: any) => request(`/users/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (pin: string) => request(`/users/${pin}`, { method: 'DELETE' }),
  },
  reports: {
    getAll: () => request('/reports'),
    create: (data: any) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
    update: (pin: string, data: any) => request(`/reports/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (pin: string) => request(`/reports/${pin}`, { method: 'DELETE' }),
  },
  notices: {
    getAll: () => request('/notices'),
    create: (data: any) => request('/notices', { method: 'POST', body: JSON.stringify(data) }),
    update: (pin: string, data: any) => request(`/notices/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (pin: string) => request(`/notices/${pin}`, { method: 'DELETE' }),
  },
  campuses: {
    getAll: () => request('/campuses'),
    create: (data: any) => request('/campuses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/campuses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/campuses/${id}`, { method: 'DELETE' }),
  },
  requests: {
    profile: {
      getAll: () => request('/requests/profile'),
      create: (data: any) => request('/requests/profile', { method: 'POST', body: JSON.stringify(data) }),
      update: (pin: string, data: any) => request(`/requests/profile/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (pin: string) => request(`/requests/profile/${pin}`, { method: 'DELETE' }),
    },
    edit: {
      getAll: () => request('/requests/edit'),
      create: (data: any) => request('/requests/edit', { method: 'POST', body: JSON.stringify(data) }),
      update: (pin: string, data: any) => request(`/requests/edit/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (pin: string) => request(`/requests/edit/${pin}`, { method: 'DELETE' }),
    },
    leave: {
      getAll: () => request('/requests/leave'),
      create: (data: any) => request('/requests/leave', { method: 'POST', body: JSON.stringify(data) }),
      update: (pin: string, data: any) => request(`/requests/leave/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (pin: string) => request(`/requests/leave/${pin}`, { method: 'DELETE' }),
    },
  },
  emails: {
    getAll: () => request('/emails'),
    create: (data: any) => request('/emails', { method: 'POST', body: JSON.stringify(data) }),
    update: (pin: string, data: any) => request(`/emails/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (pin: string) => request(`/emails/${pin}`, { method: 'DELETE' }),
  },
  feedbacks: {
    getAll: () => request('/feedbacks'),
    create: (data: any) => request('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),
    update: (pin: string, data: any) => request(`/feedbacks/${pin}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (pin: string) => request(`/feedbacks/${pin}`, { method: 'DELETE' }),
  },
  seed: (data: any) => request('/seed', { method: 'POST', body: JSON.stringify(data) }),
};
