import { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import './App.css'

// Define the structure of the activity data
interface Activity {
  id: string;
  description: string;
  imageUrl: string;
  timestamp: Timestamp;
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [diary, setDiary] = useState<Activity[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Check if the latest activity is recent (within 2 hours)
  const latestActivity = diary[0];
  let recentActivity: Activity | null = null;
  if (latestActivity) {
    const now = new Date();
    const activityDate = latestActivity.timestamp.toDate();
    const diffMs = now.getTime() - activityDate.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (diffMs <= twoHoursMs) {
      recentActivity = latestActivity;
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        setDebugMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  useEffect(() => {
    if (!user) return;

    const activitiesCol = collection(db, 'users', user.uid, 'activities');
    const q = query(activitiesCol, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userActivities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Activity));
      setDiary(userActivities);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerateActivity = async () => {
    setIsGenerating(true)
    try {
      const functions = getFunctions()
      const generateActivity = httpsCallable(functions, 'generateActivity')
      await generateActivity()
      // No need to set activity state here, the onSnapshot listener will do it.
    } catch (error) {
      console.error("Error calling generateActivity function:", error)
      alert("La génération d'une nouvelle activité a échoué. Veuillez consulter la console pour plus de détails.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user) {
    return <div>Impossible de se connecter. Veuillez réessayer plus tard.</div>
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Compagnon dino</h1>
      </header>
      <main>
        <div className="dino-display">
          {isGenerating && !recentActivity ? (
            <div className="dino-image-placeholder">
              <p>On regarde ce que ton dino fait...</p>
            </div>
          ) : recentActivity ? (
            <img src={recentActivity.imageUrl} alt={recentActivity.description} className="dino-image" />
          ) : (
            <div className="dino-image-placeholder">
              <p>On ne sait pas ce que ton dino fait en ce moment.<br/>Clique sur le bouton pour le découvrir !</p>
            </div>
          )}
          <p className="dino-activity">
            {isGenerating
              ? "..."
              : (recentActivity
                  ? recentActivity.description
                  : "Aucune activité récente. Clique sur le bouton pour voir ce que fait ton dino !")}
          </p>
        </div>
        <div className="interaction-controls">
          {(!recentActivity || debugMode) && (
            <button onClick={handleGenerateActivity} disabled={isGenerating}>
              {isGenerating ? 'Vérification...' : 'Que fait mon dino?'}
            </button>
          )}
        </div>
        <div className="activity-log">
          <h2>Journal de dino</h2>
          {diary.map((activity) => (
            <div key={activity.id} className="diary-entry">
              <img src={activity.imageUrl} alt={activity.description} className="diary-image" />
              <div className="diary-content">
                <p className="diary-description">{activity.description}</p>
                <p className="diary-timestamp">{activity.timestamp.toDate().toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
