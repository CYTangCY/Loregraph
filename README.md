# LoreGraph - Emotional Memory Extension for SillyTavern

LoreGraph is a "Graph Neural Network" style memory visualization tool for SillyTavern. It uses Google Gemini 2.5 Flash to analyze chat logs in real-time, constructing a complex 9-Axis psychological profile of character relationships.

## Features

*   **9-Axis Emotion Matrix:** Tracks Love, Friendship, Kinship, Trust, Fear, Respect, Desire, Discipline, and Power.
*   **Deep Context Analysis:** Distinguishes between **Jokes/Sarcasm** (low impact) and **Serious Events** (high impact).
*   **Behavioral Prediction:** Calculates the probability of future actions (e.g., "Attack", "Seduce", "Betray") using matrix multiplication of emotional weights.
*   **Director's Mode (God Mode):** Inject manual instructions to force specific narrative outcomes.
*   **World Info Export:** Generates a structured memory block to paste back into SillyTavern to improve long-term memory.

## Installation

### Option 1: Quick Install (Recommended for Users)
You can install this extension directly from the GitHub URL without needing any extra software.

1.  Open SillyTavern.
2.  Go to **Extensions** -> **Install Extension**.
3.  Paste the GitHub URL of this repository.
4.  Click **Install**.
5.  **Important:** Navigate to `SillyTavern/public/scripts/extensions/LoreGraph/` and open `config.js`.
6.  Paste your Google Gemini API Key there.
7.  Reload SillyTavern.

### Option 2: Developer Build (For Modders)
If you want to modify the source code, you can build the project using Node.js.

1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  **Modify files** in the `src/` directory.
4.  **Run Dev Server:** `npm run dev` (Opens `dev.html` for testing).
5.  **Build:** `npm run build` (Compiles `dev.html` and `src/` into `dist/`).
6.  **Preview:** `npm run preview` (Serves the `dist/` folder).

**Note on Architecture:**
*   `index.html` (Root) is the **Standalone** version. It uses Babel Standalone to compile code in the browser for users who install via URL.
*   `dev.html` (Root) is the **Developer** version. It links to `src/main.tsx` and is used by Vite.

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