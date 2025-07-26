import React from 'react';
import './Skills.css';

interface SkillsProps {
  skills: Record<string, number>;
}

const Skills: React.FC<SkillsProps> = ({ skills }) => {
  if (Object.keys(skills).length === 0) {
    return null;
  }

  const getSkillLevelWidth = (level: number): string => {
    return `${Math.min(100, (level / 10) * 100)}%`;
  };

  const getSkillLevelName = (level: number): string => {
    if (level >= 10) return "maître";
    if (level >= 8) return "expert";
    if (level >= 6) return "avancé";
    if (level >= 4) return "intermédiaire";
    if (level >= 2) return "débutant";
    return "novice";
  };

  return (
    <div className="skills-container">
      <h3>Habiletés</h3>
      <div className="skills-list">
        {Object.entries(skills).map(([skill, level]) => (
          <div key={skill} className="skill-item">
            <div className="skill-info">
              <span className="skill-name">{skill}</span>
              <span className="skill-level">{getSkillLevelName(level)}</span>
            </div>
            <div className="skill-bar-container">
              <div
                className="skill-bar"
                style={{ width: getSkillLevelWidth(level) }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skills;
