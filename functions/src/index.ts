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
import OpenAI from "openai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const openaiApiKey = defineSecret("OPENAI_API_KEY");

// The "DNA" of our dinosaur, used to keep its appearance consistent.
const dinoDna = `A friendly velociraptor.
It is chartreuse green with darker, forest green stripes on its back.
It has large amber eyes and an expressive face.
The style is a realistic and detailed.`;

export const generateActivity = onCall({ secrets: [openaiApiKey] }, async (request) => {
  const openai = new OpenAI({
    apiKey: openaiApiKey.value(),
  });

  logger.info("Generating new activity for user:", request.auth?.uid);

  if (!request.auth) {
    throw new Error("Authentication is required to generate an activity.");
  }
  const userId = request.auth.uid;

  try {
    // 1. Generate a creative activity description.
    const textResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [{
        role: "system",
        content: `Vous êtes un écrivain créatif pour une application d'animal de compagnie virtuel.
                  Décrivez une activité courte, amusante et un peu ridicule
                  que pourrait faire un gentil vélociraptor de compagnie.
                  Restez-en à une seule phrase concise.
                  Générez la description en français.`,
      }, {
        role: "user",
        content: "Que fait mon dino en ce moment?",
      }],
      max_tokens: 40,
    });

    const activityText = textResponse.choices[0].message.content;
    if (!activityText) {
      throw new Error("Failed to generate activity text.");
    }
    logger.info("Generated activity text:", activityText);

    // 2. Generate an image based on the activity.
    const imagePrompt = `${dinoDna}, currently: ${activityText}`;
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image URL.");
    }
    logger.info("Generated image URL:", imageUrl);

    const activityData = {
      description: activityText,
      imageUrl,
      timestamp: Timestamp.now(),
      interactionType: "ambient",
    };

    const userDocRef = db.collection("users").doc(userId);
    const dinoDocRef = userDocRef.collection("dino").doc("main");

    // Check if dino exists, if not, create it with a name.
    const dinoDoc = await dinoDocRef.get();
    if (!dinoDoc.exists) {
      await dinoDocRef.set({
        name: "Dino", // A default name
        // Initialize other personality traits as per blueprint if needed
      });
    }

    // Save the new activity
    await userDocRef.collection("activities").add(activityData);

    // Update the last activity timestamp on the dino document
    await dinoDocRef.update({
      lastActivityTimestamp: activityData.timestamp,
    });

    // 3. Return the results to the client.
    return {
      activityText,
      imageUrl,
    };
  } catch (error) {
    logger.error("Error generating activity:", error);
    // Forward a sanitized error to the client
    throw new Error("Failed to generate new activity. Please try again.");
  }
});
