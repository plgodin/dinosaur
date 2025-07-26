import React from 'react';
import './Friends.css';
import portraitTriceratops from './assets/portrait_triceratops.png';

interface FriendsProps {
  friendshipTriceratops: number;
}

const Friends: React.FC<FriendsProps> = ({ friendshipTriceratops }) => {
  if (friendshipTriceratops === 0) {
    return null;
  }

  const getFriendshipLevelName = (level: number): string => {
    if (level >= 10) return "meilleur ami";
    if (level >= 8) return "ami très proche";
    if (level >= 6) return "bon ami";
    if (level >= 4) return "ami";
    if (level >= 2) return "copain";
    return "connaissance";
  };

  const getFriendshipLevelWidth = (level: number): string => {
    return `${Math.min(100, (level / 10) * 100)}%`;
  };

  return (
    <div className="friends-container">
      <h3>Amis</h3>
      <div className="friends-list">
        <div className="friend-item">
          <div className="friend-portrait">
            <img src={portraitTriceratops} alt="Tricératops" className="friend-image" />
          </div>
          <div className="friend-info">
            <span className="friend-name">Tricératops</span>
            <span className="friend-level">{getFriendshipLevelName(friendshipTriceratops)}</span>
            <div className="friendship-bar-container">
              <div
                className="friendship-bar"
                style={{ width: getFriendshipLevelWidth(friendshipTriceratops) }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
