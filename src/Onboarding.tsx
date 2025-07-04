import { useState } from 'react';
import './Onboarding.css';
import dinoBackyard from './assets/dino_backyard.png';
import dinoHappy from './assets/dino_happy.png';

interface OnboardingProps {
  onComplete: () => void;
}

const onboardingPages = [
  {
    text: 'Allô Lau!',
  },
  {
    text: 'Pour ta fête, j\'ai un petit service à te demander...',
  },
  {
    text: 'Un jeune vélociraptor est arrivé dans notre cour hier',
    image: dinoBackyard,
  },
  {
    text: 'Penses-tu pouvoir t\'en occuper?',
  },
  {
    text: 'Il est indépendant et peut survivre tout seul, mais je pense qu\'il apprécierait ta compagnie... qu\'en penses-tu?',
  },
  {
    text: 'Yhea! Plus tu passes du temps avec lui, plus vous serez copains! Enjoy!',
    image: dinoHappy,
  },
];

function Onboarding({ onComplete }: OnboardingProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFading, setIsFading] = useState(true);

  const handleNextPage = () => {
    if (currentPage < onboardingPages.length - 1) {
      setIsFading(false);
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setIsFading(true);
      }, 300); // Match this with animation duration
    } else {
      onComplete();
    }
  };

  const page = onboardingPages[currentPage];

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        <div className={`fade-in-up ${isFading ? 'visible' : ''}`}>
          <p className="onboarding-text">{page.text}</p>
          {page.image && (
            <img src={page.image} alt="dino" className="onboarding-image" />
          )}
        </div>
      </div>
      <button onClick={handleNextPage} className="generate-btn onboarding-btn">
        Continuer
      </button>
    </div>
  );
}

export default Onboarding;
