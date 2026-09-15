import { get, post, put, del } from './api'

export function fetchServices() {
  return get('/services')
}

export function createService(service) {
  return post('/services', service)
}

export function saveServiceUpdate(id, updates) {
  return put(`/services/${id}`, updates)
}

export function removeService(id) {
  return del(`/services/${id}`)
}

export function findService(services, id) {
  return services.find((s) => s.id === id)
}

export function serviceLabels(services, serviceIds = []) {
  return serviceIds
    .map((id) => findService(services, id)?.label ?? id)
    .join(', ')
}
