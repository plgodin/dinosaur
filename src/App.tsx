import { useState, useEffect, useCallback } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, query, orderBy, onSnapshot, Timestamp, limit, startAfter, getDocs, doc } from 'firebase/firestore'
import './App.css'
import Onboarding from './Onboarding'
import Skills from './Skills'

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

const ActivitiesPerBatch = 10;

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkedForNewUser, setCheckedForNewUser] = useState(false);
  const [diary, setDiary] = useState<Activity[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingActivityText, setPendingActivityText] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalActivities, setTotalActivities] = useState(0);
  const [skills, setSkills] = useState<Record<string, number>>({});


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



  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setCheckedForNewUser(true); // No user, so we can consider the check done.
      return;
    }

    const checkNewUser = async () => {
      const activitiesCol = collection(db, 'users', user.uid, 'activities');
      const snapshot = await getDocs(query(activitiesCol, limit(1)));
      if (snapshot.empty) {
        setShowOnboarding(true);
      }
      setCheckedForNewUser(true);
    };

    checkNewUser();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setDiary([]);
      setTotalActivities(0);
      setSkills({});
      return;
    }

    const activitiesCol = collection(db, 'users', user.uid, 'activities');
    const q = query(activitiesCol, orderBy('timestamp', 'desc'), limit(ActivitiesPerBatch));

    const unsubscribeActivities = onSnapshot(q, (querySnapshot) => {
      const userActivities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Activity));
      setDiary(userActivities);
    });

    const dinoDocRef = doc(db, 'users', user.uid, 'dino', 'main');
    const unsubscribeSkills = onSnapshot(dinoDocRef, (doc) => {
      if (doc.exists()) {
        setSkills(doc.data().skills || {});
      }
    });

    getDocs(activitiesCol).then((snapshot) => {
      setTotalActivities(snapshot.size);
    });

    return () => {
      unsubscribeActivities();
      unsubscribeSkills();
    }
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

  useEffect(() => {
    if (pendingActivityText && diary.some(activity => activity.description === pendingActivityText)) {
      setIsGenerating(false);
      setPendingActivityText(null);
    }
  }, [diary, pendingActivityText]);


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

      const result = await generateActivity(requestData)
      const data = result.data as { activityText: string };

      setPendingActivityText(data.activityText);

      // Reset interaction state after generating
      setSelectedInteraction('')
      setInteractionDetails('')

      // No need to set activity state here, the onSnapshot listener will do it.
    } catch (error) {
      console.error("Error calling generateActivity function:", error)
      alert("Ça a pas marché... faut demander à Pi-Lu...")
      setIsGenerating(false); // Also stop loading on error
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
        return 'Nourrir Charlie avec...'
      case 'play':
        return 'Jouer à...'
      case 'learn':
        return 'Apprendre...'
      case 'other':
        return "Qu'est-ce qu'on fait?"
      default:
        return ''
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  // While we check if the user is new (async operation), show a loading indicator.
  if (user && !checkedForNewUser) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="auth-options">
        <h1>Oui allô!</h1>
        <p>Juste une petite étape avant de commencer...</p>
        <button onClick={handleSignInWithGoogle}>✅ Continuer avec Google 👍</button>
              </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
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
        <h1>Charlie le dino</h1>
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
              <p>Que fait Charlie en ce moment?<br/><br/>¯\_(ツ)_/¯<br/><br/>On l'a pas vu depuis un bout...</p>
            </div>
          )}
          {!isGenerating && recentActivity && <p className="dino-activity">{recentActivity.description}</p>}
          {!isGenerating && (
            <div className="interaction-controls">
              {!recentActivity && (
                <button onClick={handleGenerateActivity} className="generate-btn">
                  Que fais Charlie?
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
                    className={`interaction-btn ${selectedInteraction === 'learn' ? 'selected' : ''}`}
                    onClick={() => handleInteractionSelect('learn')}
                  >
                    Apprendre
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
        <Skills skills={skills} />
        <div className="activity-log">
          <h2>Journal de Charlie</h2>
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
          {!hasMore && diary.length > 0 && <div className="end-of-diary"><p>C'est le début de l'histoire de Charlie!</p></div>}
        </div>
      </main>
    </div>
  )
}

export default App
