import { useEffect, useState } from 'react'
import ContactForm from './components/ContactForm'
import ContactList from './components/ContactList'
import PipelineBoard from './components/PipelineBoard'
import { loadContacts, saveContacts } from './data/contacts'

function App() {
  const [contacts, setContacts] = useState(loadContacts)
  const [view, setView] = useState('board')

  // Every time contacts change, persist them so a page refresh doesn't
  // wipe your data. This is the one line you'll replace with a real API
  // call once you move off localStorage.
  useEffect(() => {
    saveContacts(contacts)
  }, [contacts])

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

  return (
    <main className="app">
      <h1>Softwash CRM</h1>
      <p className="subtitle">Contacts &amp; leads</p>
      <ContactForm onAdd={addContact} />

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
      </div>

      {view === 'board' ? (
        <PipelineBoard
          contacts={contacts}
          onUpdateStage={updateStage}
          onUpdateSchedule={updateSchedule}
          onDelete={deleteContact}
        />
      ) : (
        <ContactList
          contacts={contacts}
          onUpdateStage={updateStage}
          onUpdateSchedule={updateSchedule}
          onDelete={deleteContact}
        />
      )}
    </main>
  )
}

export default App
