import { useState, useEffect } from 'react'
import { auth } from './firebase'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import './App.css'

// Define the structure of the activity data
interface Activity {
  activityText: string
  imageUrl: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

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

  const handleGenerateActivity = async () => {
    setIsGenerating(true)
    try {
      const functions = getFunctions()
      const generateActivity = httpsCallable(functions, 'generateActivity')
      const result = await generateActivity()
      setActivity(result.data as Activity)
    } catch (error) {
      console.error("Error calling generateActivity function:", error)
      alert("Failed to generate new activity. Please check the console for details.")
    } finally {
      setIsGenerating(false)
    }
  }

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
          {isGenerating ? (
            <div className="dino-image-placeholder">
              <p>Checking on your dino...</p>
            </div>
          ) : activity ? (
            <img src={activity.imageUrl} alt={activity.activityText} className="dino-image" />
          ) : (
            <div className="dino-image-placeholder">
              <p>Click the button to see your dino!</p>
            </div>
          )}
          <p className="dino-activity">
            {isGenerating ? "..." : (activity ? activity.activityText : "Your dino is...")}
          </p>
        </div>
        <div className="interaction-controls">
          <button onClick={handleGenerateActivity} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate New Activity'}
          </button>
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
