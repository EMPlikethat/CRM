import { useEffect, useState } from 'react'
import ContactForm from './components/ContactForm'
import ContactList from './components/ContactList'
import PipelineBoard from './components/PipelineBoard'
import ServiceManager from './components/ServiceManager'
import CalendarView from './components/CalendarView'
import Dashboard from './components/Dashboard'
import PropertySearch from './components/PropertySearch'
import FollowUpsView from './components/FollowUpsView'
import ExpensesView from './components/ExpensesView'
import ReportsView from './components/ReportsView'
import MapView from './components/MapView'
import SettingsView from './components/SettingsView'
import AuthGate from './components/AuthGate'
import { fetchAuthStatus, logout } from './data/auth'
import {
  fetchContacts,
  createContact,
  saveContactUpdate,
  removeContact,
  addNote,
  deleteNote,
  addFollowUp,
  toggleFollowUp,
  deleteFollowUp,
  uploadPhoto,
  deletePhoto,
} from './data/contacts'
import {
  fetchServices,
  createService,
  saveServiceUpdate,
  removeService,
} from './data/services'
import { fetchExpenses, createExpense, removeExpense } from './data/expenses'
import { fetchProperties, retryGeocode } from './data/properties'
import { fetchSettings, saveSettings } from './data/settings'

function App() {
  // null while the initial /auth/status check is in flight.
  const [authState, setAuthState] = useState(null)
  const [contacts, setContacts] = useState([])
  const [services, setServices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [properties, setProperties] = useState([])
  const [settings, setSettings] = useState(null)
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
    Promise.all([
      fetchContacts(),
      fetchServices(),
      fetchExpenses(),
      fetchProperties(),
      fetchSettings(),
    ])
      .then(([loadedContacts, loadedServices, loadedExpenses, loadedProperties, loadedSettings]) => {
        setContacts(loadedContacts)
        setServices(loadedServices)
        setExpenses(loadedExpenses)
        setProperties(loadedProperties)
        setSettings(loadedSettings)
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

  // New properties geocode in the background on the server, so refresh
  // the list each time the Map tab is opened rather than only once on
  // login - otherwise a property located moments ago wouldn't show a pin
  // until a full page reload.
  useEffect(() => {
    if (view === 'map' && authState?.authenticated) {
      fetchProperties().then(setProperties).catch(() => {})
    }
  }, [view, authState?.authenticated])

  async function handleLogout() {
    await logout()
    setContacts([])
    setServices([])
    setExpenses([])
    setProperties([])
    setSettings(null)
    // Otherwise there's a one-render gap on the next login where
    // authState.authenticated is already true but the data-fetch effect
    // hasn't run yet - the main UI would render with settings still
    // null (it crashes reading settings.businessName) instead of
    // showing "Loading…" until the fetch actually completes.
    setLoading(true)
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

  async function handleAddNote(contactId, text) {
    const updated = await addNote(contactId, text)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function handleDeleteNote(contactId, noteId) {
    const updated = await deleteNote(contactId, noteId)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function handleAddFollowUp(contactId, text, dueDate) {
    const updated = await addFollowUp(contactId, text, dueDate)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function handleToggleFollowUp(contactId, followUpId, done) {
    const updated = await toggleFollowUp(contactId, followUpId, done)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function handleDeleteFollowUp(contactId, followUpId) {
    const updated = await deleteFollowUp(contactId, followUpId)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function handleUploadPhoto(contactId, file, caption) {
    const updated = await uploadPhoto(contactId, file, caption)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function handleDeletePhoto(contactId, photoId) {
    const updated = await deletePhoto(contactId, photoId)
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)))
  }

  async function addExpense(expense) {
    const saved = await createExpense(expense)
    setExpenses((prev) => [saved, ...prev])
  }

  async function deleteExpense(id) {
    await removeExpense(id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleRetryGeocode(id) {
    const updated = await retryGeocode(id)
    setProperties((prev) => prev.map((p) => (p.id === id ? updated : p)))
  }

  async function updateSettings(updates) {
    const updated = await saveSettings(updates)
    setSettings(updated)
    return updated
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
          <h1>{settings.businessName}</h1>
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
          className={view === 'search' ? 'active' : ''}
          onClick={() => setView('search')}
        >
          Search
        </button>
        <button
          type="button"
          className={view === 'map' ? 'active' : ''}
          onClick={() => setView('map')}
        >
          Map
        </button>
        <button
          type="button"
          className={view === 'followups' ? 'active' : ''}
          onClick={() => setView('followups')}
        >
          Follow-ups
        </button>
        <button
          type="button"
          className={view === 'expenses' ? 'active' : ''}
          onClick={() => setView('expenses')}
        >
          Expenses
        </button>
        <button
          type="button"
          className={view === 'reports' ? 'active' : ''}
          onClick={() => setView('reports')}
        >
          Reports
        </button>
        <button
          type="button"
          className={view === 'services' ? 'active' : ''}
          onClick={() => setView('services')}
        >
          Manage services
        </button>
        <button
          type="button"
          className={view === 'settings' ? 'active' : ''}
          onClick={() => setView('settings')}
        >
          Settings
        </button>
      </div>

      {view === 'dashboard' && (
        <Dashboard contacts={contacts} services={services} onNavigate={setView} />
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
      {view === 'search' && (
        <PropertySearch
          contacts={contacts}
          services={services}
          onEdit={setEditingContactId}
        />
      )}
      {view === 'map' && (
        <MapView properties={properties} onRetryGeocode={handleRetryGeocode} />
      )}
      {view === 'followups' && (
        <FollowUpsView
          contacts={contacts}
          onEdit={setEditingContactId}
          onToggleFollowUp={handleToggleFollowUp}
        />
      )}
      {view === 'expenses' && (
        <ExpensesView
          contacts={contacts}
          expenses={expenses}
          onAdd={addExpense}
          onDelete={deleteExpense}
        />
      )}
      {view === 'reports' && (
        <ReportsView contacts={contacts} expenses={expenses} />
      )}
      {view === 'services' && (
        <ServiceManager
          services={services}
          onAdd={addService}
          onUpdate={updateService}
          onDelete={deleteService}
        />
      )}
      {view === 'settings' && (
        <SettingsView settings={settings} onSave={updateSettings} />
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
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onAddFollowUp={handleAddFollowUp}
              onToggleFollowUp={handleToggleFollowUp}
              onDeleteFollowUp={handleDeleteFollowUp}
              onUploadPhoto={handleUploadPhoto}
              onDeletePhoto={handleDeletePhoto}
            />
          </div>
        </div>
      )}
    </main>
  )
}

export default App
