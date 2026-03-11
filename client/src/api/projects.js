import apiClient from './client'

export const projectsApi = {
  list: () => apiClient.get('/projects').then(r => r.data),
  get: (id) => apiClient.get(`/projects/${id}`).then(r => r.data),
  create: (data) => apiClient.post('/projects', data).then(r => r.data),
  update: (id, data) => apiClient.patch(`/projects/${id}`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/projects/${id}`).then(r => r.data),
  clone: (id) => apiClient.post(`/projects/${id}/clone`).then(r => r.data),
}

export const phasesApi = {
  list: (projectId) => apiClient.get(`/projects/${projectId}/phases`).then(r => r.data),
  create: (projectId, data) => apiClient.post(`/projects/${projectId}/phases`, data).then(r => r.data),
  update: (id, data) => apiClient.patch(`/phases/${id}`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/phases/${id}`).then(r => r.data),
  reorder: (projectId, order) => apiClient.patch(`/projects/${projectId}/phases/reorder`, { order }).then(r => r.data),
  duplicate: (id) => apiClient.post(`/phases/${id}/duplicate`).then(r => r.data),
}

export const unitTypesApi = {
  list: (phaseId) => apiClient.get(`/phases/${phaseId}/unit-types`).then(r => r.data),
  upsert: (phaseId, rows) => apiClient.put(`/phases/${phaseId}/unit-types`, { rows }).then(r => r.data),
}

export const costAssumptionsApi = {
  get: (phaseId) => apiClient.get(`/phases/${phaseId}/cost-assumptions`).then(r => r.data),
  update: (phaseId, data) => apiClient.patch(`/phases/${phaseId}/cost-assumptions`, data).then(r => r.data),
}

export const allocationApi = {
  get: (projectId) => apiClient.get(`/projects/${projectId}/cost-allocation`).then(r => r.data),
  update: (projectId, data) => apiClient.put(`/projects/${projectId}/cost-allocation`, data).then(r => r.data),
}

export const importApi = {
  downloadTemplate: () => apiClient.get('/projects/import/template', { responseType: 'blob' }).then(r => r.data),
  preview: (fileBase64) => apiClient.post('/projects/import/preview', { fileBase64 }).then(r => r.data),
  save: (data) => apiClient.post('/projects/import', data).then(r => r.data),
}

export const settingsApi = {
  get: () => apiClient.get('/settings').then(r => r.data),
  update: (data) => apiClient.patch('/settings', data).then(r => r.data),
}
