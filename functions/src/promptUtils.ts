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
 * Generates a system prompt for the activity generator, including context like time of day and special days (Eastern Time).
 * @param {Date} [date=new Date()] - The date to use for context (defaults to now).
 * @return {string} The assembled system prompt.
 */
export function generateActivityPrompt(date: Date = new Date()): string {
  // 80% normal, 20% silly
  const silly = Math.random() < 0.2;
  const timeOfDay = getTimeOfDay(date);
  const specialDay = getSpecialDay(date);

  const basePrompt = "Vous êtes un écrivain créatif pour une application d'animal de compagnie virtuel. Décrivez une activité" +
    (silly ? " courte, amusante et légèrement absurde (par exemple, une activité d'humain)" : " réaliste ou quotidienne") +
    " qu'un gentil vélociraptor de compagnie (sans plumes) pourrait faire. Si l'utilisateur a fourni des détails, mentionnez-les. Restez-en à une seule phrase concise. Générez la description en français, et utilisez seulement 'dino' pour désigner le dino. Utilisez le 'tu' plutôt que le 'vous'.\n" +
    " Voici des éléments de contexte. Ils ne sont pas tous nécessairement pertinents pour l'activité, mentionnez seulement ce qui est pertinent:\n";

  const context = [`Il est ${timeOfDay}.`];
  if (specialDay) {
    context.push(specialDay);
  }

  return `${basePrompt}\n${context.join("\n")}`;
}
