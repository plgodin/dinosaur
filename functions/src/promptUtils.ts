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
  if (hour >= 5 && hour < 12) return "le matin";
  if (hour >= 12 && hour < 18) return "l'après-midi";
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
  const hd = new Holidays("CA");
  const holiday = hd.isHoliday(dt.toJSDate());
  if (holiday && holiday[0]?.name) {
    return `C'est ${holiday[0].name.toLowerCase()}.`;
  }
  // Dino's birthday: July 4th
  if (dt.month === 7 && dt.day === 4) {
    return "C'est son anniversaire aujourd'hui !";
  }
  return null;
}

/**
 * Generates a system prompt for the activity generator, including context like time of day and special days (Eastern Time).
 * @param {Date} [date=new Date()] - The date to use for context (defaults to now).
 * @return {string} The assembled system prompt.
 */
export function generateActivityPrompt(date: Date = new Date()): string {
  // 80% normal, 20% silly
  const silly = Math.random() < 0.2;
  const timeOfDay = getTimeOfDay(date);
  const specialDay = getSpecialDay(date);

  const commonPrefix = "Vous êtes un écrivain créatif pour une application d'animal de compagnie virtuel. Décrivez une activité";
  const commonSuffix = "qu'un gentil vélociraptor de compagnie pourrait faire. Si l'utilisateur a fourni des détails, utilisez-les. Restez-en à une seule phrase concise. Générez la description en français, et utilisez seulement 'Dino' pour désigner le dino.";

  const basePrompt = silly ?
    `${commonPrefix} courte, amusante et légèrement absurde (par exemple, une activité d'humain) ${commonSuffix}` :
    `${commonPrefix} réaliste, paisible ou quotidienne ${commonSuffix}`;

  let context = `Il est ${timeOfDay}.`;
  if (specialDay) {
    context += " " + specialDay;
  }

  return `${basePrompt}\n${context}`;
}
