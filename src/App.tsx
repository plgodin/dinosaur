import { useState, useEffect } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, type User } from 'firebase/auth'
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

  const handleSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error("Google sign-in error", error)
    }
  }

  const handleSignInAnonymously = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in error", error);
    }
  };

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
      setUser(currentUser)
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
      alert("Ça a pas marché... faut demander à Pi-Lu...")
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user) {
    return (
      <div className="auth-options">
        <h1>Allô Lau!</h1>
        <p>Connecte-toi avec Google sinon tu risques de perdre ton dino 😳</p>
        <button onClick={handleSignInWithGoogle}>✅ Continuer avec Google 👍</button>
        <button onClick={handleSignInAnonymously}>❌ Continuer en anonyme 🙅🏻‍♂️</button>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Le dino à Lau</h1>
      </header>
      <main>
          {isGenerating && !recentActivity ? (
            <div className="dino-image-placeholder">
              <p>Voyons voir...</p>
            </div>
          ) : recentActivity ? (
            <img src={recentActivity.imageUrl} alt={recentActivity.description} className="dino-image" />
          ) : (
            <div className="dino-image-placeholder">
              <p>Que fait ton dino en ce moment?<br/><br/>¯\_(ツ)_/¯<br/><br/>Clique sur le bouton pour le découvrir !</p>
            </div>
          )}
          {recentActivity && <p className="dino-activity">{recentActivity.description}</p>}
        <div className="interaction-controls">
          {(!recentActivity || debugMode) && !isGenerating && (
            <button onClick={handleGenerateActivity}>Que fais mon dino?</button>
          )}
        </div>
        <div className="activity-log">
          <h2>Journal de dino</h2>
          {diary.map((activity) => (
            <div key={activity.id} className="diary-entry">
              {/* Disabled because images get deleted after a short time */}
              <img src={activity.imageUrl} alt={activity.description} className="diary-image" />
              <div className="diary-content">
                <p className="diary-description">{activity.description}</p>
                <p className="diary-timestamp">{activity.timestamp.toDate().toLocaleString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
