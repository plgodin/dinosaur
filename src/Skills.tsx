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
    if (level >= 50) return '100%';
    if (level >= 30) return `${75 + ((level - 30) / 20) * 25}%`;
    if (level >= 13) return `${50 + ((level - 13) / 17) * 25}%`;
    if (level >= 4) return `${25 + ((level - 4) / 9) * 25}%`;
    if (level > 0) return `${(level / 4) * 25}%`;
    return '0%';
  };

  return (
    <div className="skills-container">
      <h3>Habiletés</h3>
      <div className="skills-list">
        {Object.entries(skills).map(([skill, level]) => (
          <div key={skill} className="skill-item">
            <span className="skill-name">{skill}</span>
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
