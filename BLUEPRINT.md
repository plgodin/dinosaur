# Project Blueprint: The Dino Companion

## 1. Project Overview

This document outlines the plan for building a web-based virtual dinosaur pet application. The project is a birthday gift for a user who loves dinosaurs and would appreciate a fun, low-stress digital companion. The app should be in French (Canada).

The core philosophy is to create a source of joy, not a source of anxiety. The dinosaur will have its own life, and the user can check in to see what it's up to and interact with it. There are no penalties for neglect; the bond only grows stronger with positive interaction. The application will leverage AI for text and image generation to create a dynamic and surprising experience.

## 2. Core Features

### 2.1. The Persistent Dinosaur

- The user will have a single, persistent dinosaur pet.
- The dino's state (personality, mood, activities) is saved and evolves over time.

### 2.2. AI-Generated Activities & Visuals

- **Ambient Activities**: When the user opens the app after a significant period of time has passed (e.g., 4 hours), the dinosaur will be engaged in a new, randomly generated activity.
- **Dynamic Content**: Each activity is described by a short, AI-generated text and accompanied by a unique, AI-generated image.
- **Visual Consistency**: To ensure the dinosaur looks consistent across all images, we will use a "DNA Prompt." This is a detailed descriptive text of the dinosaur's appearance (e.g., "A friendly T-Rex, chartreuse green with darker forest green stripes, big amber eyes...") that is prepended to every image generation request.
- **Time-Awareness**: Activities will be contextually appropriate for the time of day, day of the week, and special occasions like the user's birthday or holidays.

### 2.3. User Interaction

- **Interaction Triggers**: Users can actively interact with the dinosaur. This will trigger a new AI-generated response (text and image) from the dino.
- **Interaction Methods**:
    - **Quick Action Buttons**: Simple, one-click buttons for common interactions like "Pet", "Play", or "Talk". These may open up a second layer of more specific options.
    - **Free-form Text Input**: A text box allowing the user to type anything they want to the dinosaur, enabling creative and open-ended interactions.

### 2.4. Progression & Personality System

- **Mood System**: The dinosaur will have a simple, descriptive mood (e.g., Playful, Contemplative, Cozy, Excited). The mood is influenced by recent interactions, time of day, and its core personality. It affects the type of activities the dino chooses and how it responds.
- **Personality Traits**: The dinosaur's personality will evolve based on the types of interactions the user engages in. These are tracked internally as numerical values on a scale but are presented to the user as descriptive text (e.g., "Your dino is becoming quite the adventurer!").
    - **Energy**: Chill ↔ Energetic
    - **Curiosity**: Cautious ↔ Adventurous
    - **Social**: Introverted ↔ Extroverted
- **Activity Log**: A scrollable, chronological history of all the dinosaur's activities and interactions, complete with the generated text and images.

## 3. Technical Implementation

### 3.1. Architecture

- **Frontend**: A Single Page Application (SPA) built with a modern framework like React or Vue. It will be designed as a Progressive Web App (PWA) to allow for "Add to Home Screen" functionality.
- **Backend**: Google Firebase will be used for all backend services.
    - **Firestore**: A NoSQL database to store all user and dinosaur data.
    - **Firebase Authentication**: For anonymous user authentication, allowing data to persist across sessions and devices.
    - **Firebase Storage**: To store and serve all AI-generated images, which helps reduce costs and latency on subsequent views.
    - **Firebase Functions**: To host secure, server-side logic that interacts with third-party AI APIs. This keeps API keys safe and off the client.

### 3.2. Firestore Database Schema

```
/users/{userId}/
  ├─ dino/
  │   ├─ name: "Rex"
  │   ├─ lastActivityTimestamp: 1678886400
  │   ├─ mood: "Playful"
  │   └─ personality: {
  │       ├─ energy: 60,      // (0-100)
  │       ├─ curiosity: 75,   // (0-100)
  │       └─ social: 40       // (0-100)
  │     }
  └─ activities/
      ├─ {activityId_1}/
      │   ├─ timestamp: 1678886400
      │   ├─ description: "Rex is attempting to build a pillow fort."
      │   ├─ imageUrl: "https://firebasestorage.googleapis.com/..."
      │   └─ interactionType: "ambient"
      └─ {activityId_2}/
          ├─ ...
```

### 3.3. Core Interaction Loop

1.  **App Load**: The user opens the web app.
2.  **State Check**: The client fetches the `dino` document from Firestore. It checks if `now() - lastActivityTimestamp` is greater than the defined threshold (e.g., 4 hours).
3.  **Trigger New Activity (if needed)**:
    - If the threshold is exceeded, the client shows a loading state (e.g., "Checking on your dino...") and calls a Firebase Function (`generateActivity`).
    - The `generateActivity` function assembles a prompt for the LLM based on the dino's personality, mood, and the time of day.
    - It gets a new activity description from the LLM (e.g., "Your dino is stargazing and pondering the universe.").
    - It combines the "DNA Prompt" with the new description to create a final prompt for the image generation API.
    - It generates the image, uploads it to Firebase Storage, and gets the public URL.
    - It saves a new document in the `activities` collection and updates the `lastActivityTimestamp` in the `dino` document.
4.  **Display**: The client receives the new data and displays the latest activity and image.
5.  **User Interaction**:
    - The user clicks an interaction button (e.g., "Play").
    - The client calls a separate Firebase Function (`handleInteraction`), passing along the interaction type.
    - The `handleInteraction` function generates a responsive text and image, similar to the process above.
    - It updates the relevant personality trait (e.g., playing increases the `energy` trait slightly).
    - It saves the new activity to the log.
6.  **Update UI**: The client updates to show the result of the interaction.

## 4. Proposed Implementation Plan

### Phase 1: Project Scaffolding & MVP

1.  **Setup**: Initialize a frontend project (e.g., with Vite or Create React App) and a new Firebase project.
2.  **Firebase Integration**: Configure Firebase in the app, enabling Firestore, Authentication (Anonymous), and Storage.
3.  **Basic UI**: Create the main app layout with placeholders for the dino image, activity text, and interaction buttons.
4.  **MVP Goal**: Connect the app to Firestore. On load, the app should authenticate the user anonymously and read a hardcoded dino state and display a static image. This validates the core setup.

### Phase 2: First AI Integration

1.  **Firebase Function**: Write and deploy the `generateActivity` Firebase Function. Securely store the AI service API key in the function's environment variables.
2.  **AI Logic**: Implement the logic to generate text and an image. Define the initial "DNA Prompt."
3.  **Frontend Call**: Implement the client-side logic to call the function on app load (if enough time has passed) and handle the loading state.
4.  **Display**: Render the AI-generated text and image.

### Phase 3: Basic Interactions & Activity Log

1.  **Interaction Function**: Create the `handleInteraction` Firebase Function.
2.  **UI Buttons**: Make the interaction buttons functional. Clicking a button should call the `handleInteraction` function.
3.  **Activity Log UI**: Create a component that fetches the `activities` collection from Firestore and displays them in a chronological list.

### Phase 4: Personality & Mood System

1.  **Data Model**: Add the `personality` and `mood` fields to the Firestore `dino` document.
2.  **Evolve Logic**: Update the `handleInteraction` function to modify the personality traits based on user actions.
3.  **Prompt Enhancement**: Update both Firebase Functions to use the mood and personality data when generating prompts, leading to more context-aware content.
4.  **Surface Insights**: Display descriptive text in the UI that reflects the dino's current mood and personality.

### Phase 5: Polish & Advanced Features

1.  **Advanced Interactions**: Implement the free-form text input and add more nuanced, multi-option buttons.
2.  **Time-Based Events**: Add logic to the `generateActivity` function to check for special dates (birthdays, holidays) and use custom prompt themes.
3.  **UI/UX Refinements**: Add animations, improve loading states, and ensure the mobile experience is polished.

## 5. Future Improvements

- **Collections System**: The dinosaur could "find" or "learn" things (e.g., treasures, skills, recipes) that are saved to a new collection in Firestore and displayed in a gallery.
- **Memory**: Enhance the prompts with a summary of recent interactions to give the dinosaur a short-term memory, allowing it to reference past events.
- **Dino Customization**: An initial setup screen where the user can choose the dinosaur's color or a starting accessory, which would be incorporated into the DNA prompt.
- **PWA Enhancements**: Implement a service worker for basic offline support (showing the last known state) and a more robust "Add to Homescreen" experience.
