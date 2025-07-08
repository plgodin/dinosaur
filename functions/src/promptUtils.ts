import Holidays from "date-holidays";
import { DateTime } from "luxon";

/**
 * Returns the time of day in French based on the provided date (Eastern Time).
 * @param {Date} date - The date to evaluate.
 * @return {string} The time of day in French.
 */
function getTimeOfDay(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: "America/Toronto" });
  const hour = dt.hour;
  if (hour >= 5 && hour < 11) return "le matin";
  if (hour >= 11 && hour < 13) return "le midi";
  if (hour >= 13 && hour < 18) return "l'après-midi";
  if (hour >= 18 && hour < 22) return "le soir";
  return "la nuit";
}

/**
 * Returns a string describing a special day (holiday or birthday) if relevant (Eastern Time).
 * @param {Date} date - The date to check for holidays or birthday.
 * @return {string | null} The special day description, or null if none.
 */
function getSpecialDay(date: Date): string | null {
  const dt = DateTime.fromJSDate(date, { zone: "America/Toronto" });
  const hd = new Holidays("CA", "QC");
  const holiday = hd.isHoliday(dt.toJSDate());
  if (holiday && holiday[0]?.name) {
    return `C'est ${holiday[0].name.toLowerCase()} aujourd'hui.`;
  }
  // Dino's birthday: July 4th
  if (dt.month === 7 && dt.day === 4) {
    return "C'est son anniversaire aujourd'hui !";
  }
  return null;
}

/**
 * Returns the name of a skill level based on its numeric value.
 * @param {number} level - The numeric skill level.
 * @return {string} The name of the skill level.
 */
function getSkillLevelName(level: number): string {
  if (level >= 50) return "maître";
  if (level >= 30) return "expert";
  if (level >= 13) return "avancé";
  if (level >= 4) return "intermédiaire";
  return "débutant";
}

/**
 * Generates a system prompt for the activity generator, including context like time of day and special days (Eastern Time).
 * @param {number} totalActivities - The total number of activities generated for the user.
 * @param {Record<string, number>} skills - The user's skills.
 * @param {Date} [date=new Date()] - The date to use for context (defaults to now).
 * @return {string} The assembled system prompt.
 */
export function generateActivityPrompt(
  totalActivities: number,
  skills: Record<string, number>,
  date: Date = new Date(),
): string {
  // 80% normal, 20% silly
  const silly = Math.random() < 0.2;
  const timeOfDay = getTimeOfDay(date);
  const specialDay = getSpecialDay(date);

  const basePrompt = "Vous êtes un écrivain créatif pour une application d'animal de compagnie virtuel. Décrivez une activité" +
    (silly ? " courte, amusante et légèrement absurde (par exemple, une activité d'humain)" : " réaliste ou quotidienne") +
    " qu'un gentil vélociraptor de compagnie (sans plumes) pourrait faire. Si l'utilisateur a fourni des détails, mentionnez-les. Restez-en à une seule phrase concise. Générez la description en français. Utilisez le 'tu' plutôt que le 'vous'.\n" +
    " Voici des éléments de contexte. Ils ne sont pas tous nécessairement pertinents pour l'activité, mentionnez seulement ce qui est pertinent:\n";

  const context = [`Il est ${timeOfDay}.`, "Le dino s'appelle Charlie."];
  if (specialDay) {
    context.push(specialDay);
  }

  if (Object.keys(skills).length > 0) {
    const skillStrings = Object.entries(skills).map(([skill, level]) => {
      return `${skill} (${getSkillLevelName(level)})`;
    });
    context.push(`Charlie a les habiletés suivantes: ${skillStrings.join(", ")}.`);
  }

  let relationshipContext = "";
  if (totalActivities < 10) {
    relationshipContext = "Charlie vient de rencontrer l'utilisateur et est un peu timide mais curieux.";
  } else if (totalActivities < 30) {
    relationshipContext = "Charlie commence à bien connaître l'utilisateur et est relativement amical envers l'utilisateur.";
  } else {
    relationshipContext = "Charlie est très proche et loyal envers l'utilisateur.";
  }
  context.push(relationshipContext);

  return `${basePrompt}\n${context.join("\n")}`;
}

/**
 * Generates a prompt for the image generator based on the activity and relationship level.
 * @param {string} activityText - The text of the generated activity.
 * @param {number} totalActivities - The total number of activities, used to determine relationship.
 * @return {string} The assembled image prompt.
 */
export function generateImagePrompt(activityText: string, totalActivities: number): string {
  let relationshipContext = "";
  if (totalActivities < 10) {
    relationshipContext = "The velociraptor appears friendly but cautious.";
  } else if (totalActivities < 30) {
    relationshipContext = "The velociraptor appears friendly and confident.";
  } else {
    relationshipContext = "The velociraptor appears very friendly, loyal, and comfortable.";
  }

  return `A scene depicting the meter-tall velociraptor from the reference image(s), currently: ${activityText}. ${relationshipContext} The scene should be photo-realistic and detailed, looking like a real photo.`;
}

/**
 * Generates a system prompt for the skill detection AI.
 * @param {string[]} skills - The user's current skills.
 * @param {boolean} isLearning - Whether the activity is a learning activity.
 * @param {string | undefined} interactionDetails - The user's input for the interaction.
 * @return {string} The assembled system prompt.
 */
export function generateSkillDetectionPrompt(skills: string[], isLearning: boolean, interactionDetails?: string): string {
  const skillList = skills.join(", ");
  let prompt = "Tu es un assistant qui doit déterminer quelle habileté est entraînée par une activité. " +
    "Réponds avec un seul mot ou une courte expression pour l'habileté, avec la première lettre en majuscule et sans ponctuation. " +
    "Si l'activité ne semble pas entraîner d'habileté, réponds 'Aucune'.";

  prompt += "\n\nExemples de bonnes habiletés: Pâtisserie, Guitare, Hockey, Programmation, Dentisterie, Jardinage.";
  prompt += "\nExemples de mauvaises habiletés (trop génériques): Coordination manuelle, Musicalité, Charisme.";

  if (skills.length > 0) {
    prompt += `\n\nVoici les habiletés que Charlie connaît déjà: ${skillList}.`;
    prompt += " Essaie de faire correspondre l'activité à l'une de ces habiletés si possible.";
  }

  if (isLearning) {
    prompt += " L'utilisateur est en train d'apprendre quelque chose à Charlie, donc tu dois absolument retourner une habileté, même si tu dois en inventer une nouvelle.";
    if (interactionDetails) {
      prompt += ` Le texte de l'utilisateur est: "${interactionDetails}". La réponse est probablement une version nettoyée de ce texte.`;
    }
  } else {
    prompt += " L'activité n'est pas spécifiquement une activité d'apprentissage, donc ne retourne une habileté que si c'est très pertinent. Ne retourne pas de nouvelle habileté à moins que l'activité le suggère fortement.";
  }

  return prompt;
}
