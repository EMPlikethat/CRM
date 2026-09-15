import { useEffect, useState } from 'react'
import ContactForm from './components/ContactForm'
import ContactList from './components/ContactList'
import { loadContacts, saveContacts } from './data/contacts'

function App() {
  const [contacts, setContacts] = useState(loadContacts)

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

  function deleteContact(id) {
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <main className="app">
      <h1>Softwash CRM</h1>
      <p className="subtitle">Contacts &amp; leads</p>
      <ContactForm onAdd={addContact} />
      <ContactList
        contacts={contacts}
        onUpdateStage={updateStage}
        onDelete={deleteContact}
      />
    </main>
  )
}

export default App
