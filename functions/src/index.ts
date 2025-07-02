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

  try {
    // 1. Generate a creative activity description.
    const textResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are a creative writer for a virtual pet app.
                  Describe a short, fun, and slightly silly activity
                  that a friendly pet velociraptor might be doing.
                  The user's pet dino has the following personality: ${dinoDna}.
                  Do not mention the dino's personality in the activity description.
                  Keep it to a single, concise sentence.`,
      }, {
        role: "user",
        content: "What is my dino doing right now?",
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
