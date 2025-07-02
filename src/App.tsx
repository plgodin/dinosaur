import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in error", error)
        })
      }
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Could not sign in. Please try again later.</div>
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dino Companion</h1>
      </header>
      <main>
        <div className="dino-display">
          <div className="dino-image-placeholder">
            <p>Dino image will appear here</p>
          </div>
          <p className="dino-activity">
            Your dino is...
          </p>
        </div>
        <div className="interaction-controls">
          <button>Pet</button>
          <button>Play</button>
          <button>Talk</button>
        </div>
        <div className="activity-log">
          <h2>Activity Log</h2>
          {/* Activity log items will go here */}
        </div>
      </main>
    </div>
  )
}

export default App
