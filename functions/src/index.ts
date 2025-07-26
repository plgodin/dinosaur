/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import OpenAI, { toFile } from "openai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { generateActivityPrompt, generateImagePrompt, generateSkillDetectionPrompt } from "./promptUtils";
import { getWeatherContext } from "./weatherUtils";
import * as fs from "fs";
import * as path from "path";

initializeApp();
const db = getFirestore();
const storage = getStorage();

const openaiApiKey = defineSecret("OPENAI_API_KEY");
const weatherApiKey = defineSecret("OPENWEATHER_API_KEY");

export const generateActivity = onCall({ secrets: [openaiApiKey, weatherApiKey] }, async (request) => {
  const openai = new OpenAI({
    apiKey: openaiApiKey.value(),
  });

  logger.info("Generating new activity for user:", request.auth?.uid);

  if (!request.auth) {
    throw new Error("Authentication is required to generate an activity.");
  }
  const userId = request.auth.uid;

  // Extract interaction parameters and location data from request data
  const { interactionType, interactionDetails, latitude, longitude } = request.data || {};

  // Reference to the user's document – we will reuse this later when saving the new activity.
  const userDocRef = db.collection("users").doc(userId);
  const dinoDocRef = userDocRef.collection("dino").doc("main");

  const dinoDoc = await dinoDocRef.get();
  if (!dinoDoc.exists) {
    await dinoDocRef.set({
      name: "Charlie",
      skills: {},
    });
  }

  const skills = dinoDoc.data()?.skills || {};

  // Retrieve the last 5 activities so the model can avoid repetition and optionally provide continuity.
  const recentActivitiesSnap = await userDocRef
    .collection("activities")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  type RecentActivity = { description: string; timestamp: Timestamp; interactionType?: string };
  const recentActivities = recentActivitiesSnap.docs.map((doc) => doc.data() as RecentActivity);
  const totalActivities = recentActivitiesSnap.size;

  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const activitiesList = recentActivities
    .map((a, idx) => `${idx + 1}. ${a.description}`)
    .join("\n");

  const mostRecentIsFresh =
    recentActivities[0] && now - recentActivities[0].timestamp.toDate().getTime() <= twoHoursMs;

  let activitiesContext = "";
  if (recentActivities.length > 0) {
    activitiesContext =
      `Voici les ${recentActivities.length} dernières activités de Charlie le dino (de la plus récente à la plus ancienne):\n${activitiesList}\n\n` +
      "Évite de répéter ces activités. " +
      (mostRecentIsFresh ?
        "Tu peux faire un lien logique avec l'activité #1 parce qu'elle est très récente, mais ce n'est pas obligatoire. " :
        "") +
      "Ne t'enferme pas dans une suite d'activités trop similaires.";
  }

  try {
    // 1. Get weather context if available
    const weatherContext = await getWeatherContext(latitude, longitude, weatherApiKey.value());

    // 2. Generate a creative activity description.
    let systemPrompt = generateActivityPrompt(totalActivities, skills);

    // Add activities context if available
    if (activitiesContext) {
      systemPrompt += `\n\n${activitiesContext}`;
    }

    // Add weather context if available and notable
    if (weatherContext && weatherContext.isNotable) {
      systemPrompt += `\n\n${weatherContext.contextText}`;
    }

    // Create user message based on interaction type
    let userMessage = "Que fait Charlie le dino en ce moment?";
    let activityType = "ambient";

    if (interactionType && interactionDetails) {
      switch (interactionType) {
      case "feed":
        activityType = "feed";
        userMessage = `Je nourris Charlie le dino avec: ${interactionDetails}. Que se passe-t-il?`;
        break;
      case "play":
        activityType = "play";
        userMessage = `Je joue avec Charlie le dino: ${interactionDetails}. Que se passe-t-il?`;
        break;
      case "learn":
        activityType = "learn";
        userMessage = `J'apprends à Charlie le dino à: ${interactionDetails}. Que se passe-t-il?`;
        break;
      case "other":
        activityType = "custom";
        userMessage = `${interactionDetails}\n\nQue se passe-t-il avec Charlie le dino?`;
        break;
      default:
        activityType = "ambient";
        userMessage = "Que fait Charlie le dino en ce moment?";
      }
    }

    const textResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [{
        role: "system",
        content: systemPrompt,
      }, {
        role: "user",
        content: userMessage,
      }],
      max_tokens: 100,
    });

    const activityText = textResponse.choices[0].message.content;
    if (!activityText) {
      throw new Error("Failed to generate activity text.");
    }
    logger.info("Generated activity text:", activityText);

    // 2. Asynchronously generate and save the image.
    (async () => {
      try {
        const referenceImagePath = path.resolve(__dirname, "../src/reference-images");
        if (!fs.existsSync(referenceImagePath)) {
          throw new Error("Reference images directory not found.");
        }

        const imageFiles = fs.readdirSync(referenceImagePath).slice(0, 4);

        const images = (await Promise.all(
          imageFiles.map(async (file) => {
            const filePath = path.join(referenceImagePath, file);
            const ext = path.extname(file).toLowerCase();
            let mimeType: string | undefined;

            if (ext === ".png") {
              mimeType = "image/png";
            } else if (ext === ".jpg" || ext === ".jpeg") {
              mimeType = "image/jpeg";
            } else if (ext === ".webp") {
              mimeType = "image/webp";
            } else {
              logger.warn(`Skipping unsupported file type: ${file}`);
              return null;
            }

            return await toFile(fs.createReadStream(filePath), file, {
              type: mimeType,
            });
          }),
        )).filter((image): image is NonNullable<typeof image> => image !== null);

        if (images.length === 0) {
          throw new Error("No reference images with supported format (png, jpeg, webp) found in directory.");
        }

        const imagePrompt = generateImagePrompt(activityText, totalActivities);
        const imageResponse = await openai.images.edit({
          model: "gpt-image-1",
          image: images,
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
        });

        const imageBase64 = imageResponse.data?.[0]?.b64_json;
        if (!imageBase64) {
          throw new Error("Failed to generate image data.");
        }

        const imageBuffer = Buffer.from(imageBase64!, "base64");

        const bucket = storage.bucket();
        const fileName = `dino-images/${userId}/${Date.now()}.png`;
        const file = bucket.file(fileName);

        await file.save(imageBuffer, {
          metadata: {
            contentType: "image/png",
          },
          public: true,
        });

        const imageUrl = file.publicUrl();

        logger.info("Generated image and uploaded to:", imageUrl);

        const activityData = {
          description: activityText,
          imageUrl,
          timestamp: Timestamp.now(),
          interactionType: activityType,
        };

        await userDocRef.collection("activities").add(activityData);

        await dinoDocRef.update({
          lastActivityTimestamp: activityData.timestamp,
        });

        // Skill detection and update
        const isLearning = activityType === "learn";
        const skillDetectionSystemPrompt = generateSkillDetectionPrompt(Object.keys(skills), isLearning, interactionDetails);

        const skillDetectionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.2,
          messages: [{
            role: "system",
            content: skillDetectionSystemPrompt,
          }, {
            role: "user",
            content: activityText,
          }],
          max_tokens: 20,
        });

        const detectedSkill = skillDetectionResponse.choices[0].message.content?.trim();

        if (detectedSkill && detectedSkill.toLowerCase() !== "aucune") {
          logger.info(`Detected skill: ${detectedSkill}`);
          const currentLevel = skills[detectedSkill] || 0;
          const newLevel = currentLevel + 1;
          await dinoDocRef.update({
            [`skills.${detectedSkill}`]: newLevel,
          });
        }
      } catch (error) {
        logger.error("Error in background image generation:", error);
      }
    })();

    // 3. Return the results to the client.
    return {
      activityText,
    };
  } catch (error) {
    logger.error("Error generating activity:", error);
    // Forward a sanitized error to the client
    throw new Error("Failed to generate new activity. Please try again.");
  }
});
