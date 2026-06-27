const BASE = '/api/todos';

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== 'all'))
    ).toString();
    return request(`${BASE}${qs ? '?' + qs : ''}`);
  },
  getById: (id) => request(`${BASE}/${id}`),
  create: (body) => request(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (id, body) => request(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
  deleteMany: (ids) => request(BASE, { method: 'DELETE', body: JSON.stringify({ ids }) }),
  clearCompleted: () => request(BASE, { method: 'DELETE', body: JSON.stringify({}) }),
  getStats: () => request('/api/stats'),
  getActivity: () => request(`${BASE}/activity`),
  reorder: (ids) => request(`${BASE}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
  exportTodos: (format = 'json') => {
    window.open(`${BASE}/export?format=${format}`, '_blank');
  },
};
