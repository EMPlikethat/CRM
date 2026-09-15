import { get, post, put, del } from './api'

export function fetchExpenses() {
  return get('/expenses')
}

export function createExpense(expense) {
  return post('/expenses', expense)
}

export function saveExpenseUpdate(id, updates) {
  return put(`/expenses/${id}`, updates)
}

export function removeExpense(id) {
  return del(`/expenses/${id}`)
}
