import { useEffect, useState } from 'react'
import ContactForm from './components/ContactForm'
import ContactList from './components/ContactList'
import PipelineBoard from './components/PipelineBoard'
import ServiceManager from './components/ServiceManager'
import CalendarView from './components/CalendarView'
import Dashboard from './components/Dashboard'
import AuthGate from './components/AuthGate'
import { fetchAuthStatus, logout } from './data/auth'
import {
  fetchContacts,
  createContact,
  saveContactUpdate,
  removeContact,
} from './data/contacts'
import {
  fetchServices,
  createService,
  saveServiceUpdate,
  removeService,
} from './data/services'

function App() {
  // null while the initial /auth/status check is in flight.
  const [authState, setAuthState] = useState(null)
  const [contacts, setContacts] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState('dashboard')
  const [editingContactId, setEditingContactId] = useState(null)
  const editingContact = contacts.find((c) => c.id === editingContactId) ?? null

  useEffect(() => {
    fetchAuthStatus()
      .then(setAuthState)
      .catch((err) => setLoadError(err.message))
  }, [])

  // Only load contacts/services once signed in. A 401 here means the
  // session expired mid-use (cookie cleared, server restarted with a
  // fresh secret, etc.) - bounce back to the sign-in screen instead of
  // showing a raw error.
  useEffect(() => {
    if (!authState?.authenticated) return
    setLoading(true)
    Promise.all([fetchContacts(), fetchServices()])
      .then(([loadedContacts, loadedServices]) => {
        setContacts(loadedContacts)
        setServices(loadedServices)
      })
      .catch((err) => {
        if (err.status === 401) {
          setAuthState({ authenticated: false, needsSetup: false })
        } else {
          setLoadError(err.message)
        }
      })
      .finally(() => setLoading(false))
  }, [authState?.authenticated])

  async function handleLogout() {
    await logout()
    setContacts([])
    setServices([])
    setAuthState({ authenticated: false, needsSetup: false })
  }

  async function addContact(contact) {
    const saved = await createContact(contact)
    setContacts((prev) => [...prev, saved])
  }

  async function updateStage(id, stage) {
    const updated = await saveContactUpdate(id, { stage })
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  async function updateSchedule(id, scheduledAt) {
    const updated = await saveContactUpdate(id, { scheduledAt })
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  async function updateContact(id, updates) {
    const updated = await saveContactUpdate(id, updates)
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  async function deleteContact(id) {
    await removeContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  async function deleteContactFromModal(id) {
    await deleteContact(id)
    setEditingContactId(null)
  }

  async function addService(service) {
    const saved = await createService(service)
    setServices((prev) => [...prev, saved])
  }

  async function updateService(id, updates) {
    const updated = await saveServiceUpdate(id, updates)
    setServices((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function deleteService(id) {
    await removeService(id)
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  if (loadError) {
    return (
      <main className="app">
        <p className="status-message error">
          Couldn't reach the API server ({loadError}). Make sure it's running
          with <code>npm run server</code> in a separate terminal.
        </p>
      </main>
    )
  }

  if (!authState) {
    return (
      <main className="app">
        <p className="status-message">Loading…</p>
      </main>
    )
  }

  if (!authState.authenticated) {
    return (
      <AuthGate
        needsSetup={authState.needsSetup}
        onAuthenticated={() => setAuthState({ authenticated: true, needsSetup: false })}
      />
    )
  }

  if (loading) {
    return (
      <main className="app">
        <p className="status-message">Loading…</p>
      </main>
    )
  }

  return (
    <main className="app">
      <div className="app-header">
        <div>
          <h1>MCH CRM</h1>
          <p className="subtitle">Contacts &amp; leads</p>
        </div>
        <button type="button" className="cancel-btn" onClick={handleLogout}>
          Log out
        </button>
      </div>
      <ContactForm services={services} onAdd={addContact} />

      <div className="view-toggle">
        <button
          type="button"
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={view === 'board' ? 'active' : ''}
          onClick={() => setView('board')}
        >
          Pipeline board
        </button>
        <button
          type="button"
          className={view === 'list' ? 'active' : ''}
          onClick={() => setView('list')}
        >
          List
        </button>
        <button
          type="button"
          className={view === 'calendar' ? 'active' : ''}
          onClick={() => setView('calendar')}
        >
          Calendar
        </button>
        <button
          type="button"
          className={view === 'services' ? 'active' : ''}
          onClick={() => setView('services')}
        >
          Manage services
        </button>
      </div>

      {view === 'dashboard' && (
        <Dashboard contacts={contacts} services={services} />
      )}
      {view === 'board' && (
        <PipelineBoard
          contacts={contacts}
          services={services}
          onUpdateStage={updateStage}
          onUpdateSchedule={updateSchedule}
          onDelete={deleteContact}
          onEdit={setEditingContactId}
        />
      )}
      {view === 'list' && (
        <ContactList
          contacts={contacts}
          services={services}
          onUpdateStage={updateStage}
          onUpdateSchedule={updateSchedule}
          onDelete={deleteContact}
          onEdit={setEditingContactId}
        />
      )}
      {view === 'calendar' && (
        <CalendarView contacts={contacts} services={services} />
      )}
      {view === 'services' && (
        <ServiceManager
          services={services}
          onAdd={addService}
          onUpdate={updateService}
          onDelete={deleteService}
        />
      )}

      {editingContact && (
        <div className="modal-overlay" onClick={() => setEditingContactId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <ContactForm
              services={services}
              editingContact={editingContact}
              onSave={async (id, updates) => {
                await updateContact(id, updates)
                setEditingContactId(null)
              }}
              onCancel={() => setEditingContactId(null)}
              onDelete={deleteContactFromModal}
            />
          </div>
        </div>
      )}
    </main>
  )
}

export default App
