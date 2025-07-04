import { useState, useEffect, useCallback } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, type User } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, query, orderBy, onSnapshot, Timestamp, limit, startAfter, getDocs } from 'firebase/firestore'
import './App.css'

// Define the structure of the activity data
interface Activity {
  id: string;
  description: string;
  imageUrl: string;
  timestamp: Timestamp;
  interactionType?: string; // "ambient", "feed", "play", or "custom"
}

// Define the structure for interaction request data
interface InteractionRequestData {
  interactionType?: string;
  interactionDetails?: string;
}

const ActivitiesPerBatch = 2;

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [diary, setDiary] = useState<Activity[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalActivities, setTotalActivities] = useState(0);


  // New state for interactions
  const [selectedInteraction, setSelectedInteraction] = useState<string>('')
  const [interactionDetails, setInteractionDetails] = useState<string>('')

  // Check if the latest activity is recent (within 2 hours)
  const latestActivity = diary[0];
  let recentActivity: Activity | null = null;
  if (latestActivity) {
    const now = new Date();
    const activityDate = latestActivity.timestamp.toDate();
    const diffMs = now.getTime() - activityDate.getTime();
    const oneHourMs = 60 * 60 * 1000;
    if (diffMs <= oneHourMs) {
      recentActivity = latestActivity;
    }
  }

  // Check if there's been a recent feed activity (within 8 hours)
  const hasRecentFeed = diary.some(activity => {
    if (activity.interactionType !== 'feed') return false;
    const now = new Date();
    const activityDate = activity.timestamp.toDate();
    const diffMs = now.getTime() - activityDate.getTime();
    const eightHoursMs = 8 * 60 * 60 * 1000;
    return diffMs <= eightHoursMs;
  });

  // Check if feed button should be disabled
  const isFeedDisabled = hasRecentFeed;

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setDiary([]);
      setTotalActivities(0);
      return;
    }

    const activitiesCol = collection(db, 'users', user.uid, 'activities');
    const q = query(activitiesCol, orderBy('timestamp', 'desc'), limit(ActivitiesPerBatch));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userActivities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Activity));
      setDiary(userActivities);
    });

    getDocs(activitiesCol).then((snapshot) => {
      setTotalActivities(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const hasMore = diary.length < totalActivities;

  const loadMoreActivities = useCallback(async () => {
    if (loadingMore || !hasMore || !user) return;
    setLoadingMore(true);

    try {
      const activitiesCol = collection(db, 'users', user.uid, 'activities');
      const lastDoc = diary[diary.length - 1];
      const q = query(activitiesCol, orderBy('timestamp', 'desc'), startAfter(lastDoc.timestamp), limit(ActivitiesPerBatch));
      const documentSnapshots = await getDocs(q);

      const newActivities = documentSnapshots.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Activity));

      setDiary(prev => [...prev, ...newActivities]);
    } catch (error) {
      console.error("Error loading more activities:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [user, diary, hasMore, loadingMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop < document.documentElement.offsetHeight - 100 || loadingMore || !hasMore) {
        return
      }
      loadMoreActivities()
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadingMore, hasMore, loadMoreActivities]);


  const handleGenerateActivity = async () => {
    setIsGenerating(true)
    try {
      const functions = getFunctions()
      const generateActivity = httpsCallable(functions, 'generateActivity')

      // Prepare data to send to the function
      const requestData: InteractionRequestData = {}
      if (selectedInteraction && interactionDetails.trim()) {
        requestData.interactionType = selectedInteraction
        requestData.interactionDetails = interactionDetails.trim()
      }

      await generateActivity(requestData)

      // Reset interaction state after generating
      setSelectedInteraction('')
      setInteractionDetails('')

      // No need to set activity state here, the onSnapshot listener will do it.
    } catch (error) {
      console.error("Error calling generateActivity function:", error)
      alert("Ça a pas marché... faut demander à Pi-Lu...")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInteractionSelect = (type: string) => {
    if (selectedInteraction === type) {
      // If clicking the same button, deselect it
      setSelectedInteraction('')
      setInteractionDetails('')
    } else {
      // If clicking a different button, select it
      setSelectedInteraction(type)
      setInteractionDetails('')
    }
  }

  const getPlaceholderText = (interactionType?: string) => {
    const type = interactionType || selectedInteraction
    switch (type) {
      case 'feed':
        return 'Nourrir le dino avec...'
      case 'play':
        return 'Jouer à...'
      case 'other':
        return "Qu'est-ce qu'on fait?"
      default:
        return ''
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

  const getRelationshipLevel = (totalActivities: number) => {
    if (totalActivities >= 55) return "Meilleur ami";
    if (totalActivities >= 42) return "Fidèle compagnon";
    if (totalActivities >= 32) return "Complice rusé";
    if (totalActivities >= 23) return "Partenaire de chasse";
    if (totalActivities >= 15) return "Nouvel ami";
    if (totalActivities >= 9) return "Compagnon curieux";
    if (totalActivities >= 4) return "Connaissance prudente";
    return "Nouvelle rencontre";
  };

  const relationshipLevel = getRelationshipLevel(totalActivities);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Le dino à Lau</h1>
        {<p className="relationship-level">{relationshipLevel}</p>}
      </header>
      <main>
          {isGenerating ? (
            <div className="dino-image-placeholder">
              <p>Voyons voir... ⏳</p>
            </div>
          ) : recentActivity ? (
            <img src={recentActivity.imageUrl} alt={recentActivity.description} className="dino-image" />
          ) : (
            <div className="dino-image-placeholder">
              <p>Que fait ton dino en ce moment?<br/><br/>¯\_(ツ)_/¯<br/><br/>On l'a pas vu depuis un bout...</p>
            </div>
          )}
          {!isGenerating && recentActivity && <p className="dino-activity">{recentActivity.description}</p>}
          {!isGenerating && (
            <div className="interaction-controls">
              {!recentActivity && (
                <button onClick={handleGenerateActivity} className="generate-btn">
                  Que fais mon dino?
                </button>
              )}
              <div className="interaction-options">
                <div className="interaction-buttons">
                  <button
                    className={`interaction-btn ${selectedInteraction === 'feed' ? 'selected' : ''} ${isFeedDisabled ? 'disabled' : ''}`}
                    onClick={() => !isFeedDisabled && handleInteractionSelect('feed')}
                    disabled={isFeedDisabled}
                  >
                    Nourrir
                  </button>
                  <button
                    className={`interaction-btn ${selectedInteraction === 'play' ? 'selected' : ''}`}
                    onClick={() => handleInteractionSelect('play')}
                  >
                    Jouer
                  </button>
                  <button
                    className={`interaction-btn ${selectedInteraction === 'other' ? 'selected' : ''}`}
                    onClick={() => handleInteractionSelect('other')}
                  >
                    Autre
                  </button>
                </div>
                {selectedInteraction && (
                  <div className="interaction-input">
                    <input
                      type="text"
                      value={interactionDetails}
                      onChange={(e) => setInteractionDetails(e.target.value)}
                      placeholder={getPlaceholderText()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && interactionDetails.trim()) {
                          handleGenerateActivity()
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              {selectedInteraction && (
                <button
                  onClick={handleGenerateActivity}
                  className="generate-btn"
                  disabled={!interactionDetails.trim()}
                >
                  Confirmer
                </button>
              )}
            </div>
          )}
        <div className="activity-log">
          <h2>Journal de dino</h2>
          {diary.map((activity) => (
            <div key={activity.id} className="diary-entry">
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
          {loadingMore && <div className="loading-more"><p>Chargement...</p></div>}
          {!hasMore && diary.length > 0 && <div className="end-of-diary"><p>C'est le début de l'histoire de dino!</p></div>}
        </div>
      </main>
    </div>
  )
}

export default App
