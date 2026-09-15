import { useEffect, useState } from 'react'
import ContactForm from './components/ContactForm'
import ContactList from './components/ContactList'
import PipelineBoard from './components/PipelineBoard'
import ServiceManager from './components/ServiceManager'
import CalendarView from './components/CalendarView'
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
  const [contacts, setContacts] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [view, setView] = useState('board')
  const [editingContactId, setEditingContactId] = useState(null)
  const editingContact = contacts.find((c) => c.id === editingContactId) ?? null

  // Load once from the API server on mount. Every mutation below calls
  // the server directly and updates state from its response, instead of
  // writing the whole array back like the localStorage version did.
  useEffect(() => {
    Promise.all([fetchContacts(), fetchServices()])
      .then(([loadedContacts, loadedServices]) => {
        setContacts(loadedContacts)
        setServices(loadedServices)
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

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

  if (loading) {
    return (
      <main className="app">
        <p className="status-message">Loading…</p>
      </main>
    )
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

  return (
    <main className="app">
      <h1>MCH CRM</h1>
      <p className="subtitle">Contacts &amp; leads</p>
      <ContactForm services={services} onAdd={addContact} />

      <div className="view-toggle">
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
