
# LoreGraph - Emotional Memory Extension for SillyTavern

LoreGraph is a "Graph Neural Network" style memory visualization tool for SillyTavern. It uses Google Gemini 2.5 Flash to analyze chat logs in real-time, constructing a complex 9-Axis psychological profile of character relationships.

## Features

*   **9-Axis Emotion Matrix:** Tracks Love, Friendship, Kinship, Trust, Fear, Respect, Desire, Discipline, and Power.
*   **Deep Context Analysis:** Distinguishes between **Jokes/Sarcasm** (low impact) and **Serious Events** (high impact).
*   **Behavioral Prediction:** Calculates the probability of future actions (e.g., "Attack", "Seduce", "Betray") using matrix multiplication of emotional weights.
*   **Director's Mode (God Mode):** Inject manual instructions to force specific narrative outcomes.
*   **World Info Export:** Generates a structured memory block to paste back into SillyTavern to improve long-term memory.

## Installation

### 1. Prerequisite: Build the App
Because this extension uses React, it must be built before SillyTavern can use it.

1.  Open a terminal in this folder.
2.  Run `npm install` to get dependencies.
3.  Run `npm run build` (or your preferred build command). 
4.  Ensure the output (index.html and js bundles) is in the root of this extension folder or update `extension.js` `GRAPH_URL` to point to the build folder.

### 2. Install in SillyTavern
1.  Navigate to your SillyTavern installation folder: `.../SillyTavern/public/scripts/extensions/`
2.  Clone or paste this `LoreGraph` folder there.
3.  Restart SillyTavern.
4.  Go to **Extensions** -> **Manage Extensions** and ensure `LoreGraph` is enabled.

### 3. Setup API Key
The extension requires a Google Gemini API Key.
*   You must set your `API_KEY` in the environment or code (Note: For local extensions, you might need to hardcode it in `services/geminiService.ts` or use a proxy if you cannot set `process.env.API_KEY` in the browser context easily).

## Usage

### Opening the Graph
*   **Method 1 (Slash Command):** Type `/loregraph` in the chat bar or add it to a Quick Reply button.
*   **Method 2 (Menu):** Open the Extensions menu (Plug icon) and scroll down to click "LoreGraph Monitor".
*   **Method 3 (Magic Wand):** Add `/loregraph` to a Macro in the Tools/Magic Wand menu.

### How it Works
1.  **Auto-Reading:** As you chat, LoreGraph buffers the messages.
2.  **Processing:** When the buffer fills or you click "Process Block", it sends the text to Gemini.
3.  **Tone Detection:** The AI determines if the text is Serious or Joking.
    *   *Jokes:* Values change by < 1-5%.
    *   *Serious:* Values change by 10-50%.
4.  **Visualization:** The graph updates. Colors represent the dominant emotion.
