import { useEffect, useState } from 'react'
import ContactForm from './components/ContactForm'
import ContactList from './components/ContactList'
import PipelineBoard from './components/PipelineBoard'
import ServiceManager from './components/ServiceManager'
import CalendarView from './components/CalendarView'
import { loadContacts, saveContacts } from './data/contacts'
import { loadServices, saveServices } from './data/services'

function App() {
  const [contacts, setContacts] = useState(loadContacts)
  const [services, setServices] = useState(loadServices)
  const [view, setView] = useState('board')
  const [editingContactId, setEditingContactId] = useState(null)
  const editingContact = contacts.find((c) => c.id === editingContactId) ?? null

  // Every time contacts/services change, persist them so a page refresh
  // doesn't wipe your data. These are the two lines you'll replace with
  // real API calls once you move off localStorage.
  useEffect(() => {
    saveContacts(contacts)
  }, [contacts])

  useEffect(() => {
    saveServices(services)
  }, [services])

  function addContact(contact) {
    setContacts((prev) => [...prev, contact])
  }

  function updateStage(id, stage) {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stage } : c)),
    )
  }

  function updateSchedule(id, scheduledAt) {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, scheduledAt } : c)),
    )
  }

  function deleteContact(id) {
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  function updateContact(id, updates) {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    )
  }

  function deleteContactFromModal(id) {
    deleteContact(id)
    setEditingContactId(null)
  }

  function addService(service) {
    setServices((prev) => [...prev, service])
  }

  function updateService(id, updates) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    )
  }

  function deleteService(id) {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <main className="app">
      <h1>Softwash CRM</h1>
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
              onSave={(id, updates) => {
                updateContact(id, updates)
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
