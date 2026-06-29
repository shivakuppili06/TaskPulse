const BASE = 'https://task-pulse-beige.vercel.app/api/todos';

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
    let finalParams = { ...params };
    if (finalParams.sortBy && finalParams.sortBy.includes('_')) {
      const [field, order] = finalParams.sortBy.split('_');
      finalParams.sortBy = field;
      finalParams.order = order;
    }
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(finalParams).filter(([, v]) => v && v !== 'all'))
    ).toString();
    return request(`${BASE}${qs ? '?' + qs : ''}`);
  },
  getById: (id) => request(`${BASE}/${id}`),
  create: (body) => request(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (id, body) => request(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
  deleteMany: (ids) => request(BASE, { method: 'DELETE', body: JSON.stringify({ ids }) }),
  bulkAction: (action, ids, value) => request(`${BASE}/bulk`, { method: 'PATCH', body: JSON.stringify({ action, ids, value }) }),
  clearCompleted: () => request(BASE, { method: 'DELETE', body: JSON.stringify({}) }),
  reorder: (ids) => request(`${BASE}/reorder`, { method: 'POST', body: JSON.stringify({ ids }) }),
  getActivity: () => request(`${BASE}/activity`),
  getStats: () => request(`${BASE}/stats`),
};
