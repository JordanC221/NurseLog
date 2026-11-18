async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }
  return payload;
}

function entity(name) {
  return {
    list: (_sort, limit) => api(`/api/entities/${name}?limit=${limit || 100}`),
    get: (id) => api(`/api/entities/${name}/${encodeURIComponent(id)}`),
    create: (body) => api(`/api/entities/${name}`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => api(`/api/entities/${name}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => api(`/api/entities/${name}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    filter: (body) => api(`/api/entities/${name}/filter`, { method: 'POST', body: JSON.stringify(body) }),
    bulkCreate: (items) => api(`/api/entities/${name}/bulk`, { method: 'POST', body: JSON.stringify({ items }) }),
    deleteMany: (body = {}) => api(`/api/entities/${name}/delete-many`, { method: 'POST', body: JSON.stringify(body) }),
    count: (body = {}) => api(`/api/entities/${name}/count`, { method: 'POST', body: JSON.stringify(body) }),
    aggregate: (body = {}) => api(`/api/entities/${name}/aggregate`, { method: 'POST', body: JSON.stringify(body) }),
  };
}

export const nurselog = {
  auth: {
    me: () => api('/api/auth/me'),
    register: ({ email, password, name }) => api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    verifyOtp: ({ email, otpCode }) => api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: otpCode }) }),
    resendOtp: (email) => api('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
    loginViaEmailPassword: async (email, password) => {
      const payload = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      return payload;
    },
    loginWithProvider: () => Promise.reject(new Error('External OAuth is not configured. Use email and password.')),
    logout: () => api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => undefined),
    setToken: () => undefined,
    redirectToLogin: () => { window.location.assign('/login'); },
    resetPasswordRequest: (email) => api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: ({ resetToken, newPassword }) => api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: resetToken, password: newPassword }) }),
  },
  entities: Object.fromEntries([
    'SkillLog','HoursSession','SkillRequirement','AppSettings','StudySet','Flashcard','ExamQuestion',
    'StudyResponse','StudyAttempt','StudyMaterial','CaseStudy','ClassSession','User'
  ].map((name) => [name, entity(name)])),
  integrations: {
    Core: {
      UploadPrivateFile: async ({ file }) => {
        const form = new FormData();
        form.append('file', file);
        const response = await fetch('/api/files/upload', { method: 'POST', credentials: 'include', body: form });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Upload failed.');
        return { file_uri: payload.file_uri, file_name: payload.file_name };
      },
    },
  },
  functions: {
    invoke: (name, body) => api(`/api/functions/${name}`, { method: 'POST', body: JSON.stringify(body) }),
  },
};
