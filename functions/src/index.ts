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
import { generateActivityPrompt } from "./promptUtils";
import * as fs from "fs";
import * as path from "path";

initializeApp();
const db = getFirestore();
const storage = getStorage();

const openaiApiKey = defineSecret("OPENAI_API_KEY");

// The "DNA" of our dinosaur, used to keep its appearance consistent.
// We are now using reference images instead of a DNA prompt.

export const generateActivity = onCall({ secrets: [openaiApiKey] }, async (request) => {
  const openai = new OpenAI({
    apiKey: openaiApiKey.value(),
  });

  logger.info("Generating new activity for user:", request.auth?.uid);

  if (!request.auth) {
    throw new Error("Authentication is required to generate an activity.");
  }
  const userId = request.auth.uid;

  // Extract interaction parameters from request data
  const { interactionType, interactionDetails } = request.data || {};

  try {
    // 1. Generate a creative activity description.
    const systemPrompt = generateActivityPrompt();

    // Create user message based on interaction type
    let userMessage = "Que fait mon dino en ce moment?";
    let activityType = "ambient";

    if (interactionType && interactionDetails) {
      activityType = "interactive";
      switch (interactionType) {
        case "feed":
          userMessage = `Je nourris mon dino avec: ${interactionDetails}. Que se passe-t-il?`;
          break;
        case "play":
          userMessage = `Je joue avec mon dino: ${interactionDetails}. Que se passe-t-il?`;
          break;
        case "other":
          userMessage = `${interactionDetails}\n\nQue se passe-t-il avec mon dino?`;
          break;
        default:
          userMessage = "Que fait mon dino en ce moment?";
          activityType = "ambient";
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
      max_tokens: 50,
    });

    const activityText = textResponse.choices[0].message.content;
    if (!activityText) {
      throw new Error("Failed to generate activity text.");
    }
    logger.info("Generated activity text:", activityText);

    // 2. Generate an image based on the activity.
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

    const imagePrompt = `A scene depicting the velociraptor from the reference image(s), currently: ${activityText}.\n The scene should be realistic and detailed.`;
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
