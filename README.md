
# LoreGraph - Emotional Memory System

LoreGraph is a dynamic memory visualization tool for SillyTavern. It uses Google Gemini to analyze chat logs, build a psychological profile of character relationships (Love, Trust, Fear, etc.), and **automatically injects this memory back into the chat**.

## Features
1.  **9-Axis Graph**: Visualizes complex relationships.
2.  **Auto-Injection**: The graph's summary is automatically fed into the AI's system prompt, helping it remember relationships and past events.
3.  **Toolbar Integration**: Access the graph via the "Magic Wand" or Toolbar.

## Installation
1.  In SillyTavern, go to **Extensions** -> **Install Extension**.
2.  Paste this repo URL and install.
3.  Reload SillyTavern.

## Configuration (Important!)
1.  Open the **Extensions** tab (Plug icon).
2.  Expand the **LoreGraph** settings panel.
3.  Enter your **Google Gemini API Key**.
    *   Get one here: [Google AI Studio](https://aistudiocdn.com/)
4.  Ensure "Auto-Inject Memory" is checked.

## Usage
*   **View Graph**: Click the **Open Graph Monitor** button in settings, or the **Circle Nodes Icon** in the top toolbar.
*   **Chat**: Just chat normally. The extension will buffer messages.
*   **Update**: Click "Process" in the Graph window to update the memory model. The new memory will be used in your next reply.

## Troubleshooting
*   **"Failed to load"**: Ensure you are connected to the internet (to load React/Gemini libraries).
*   **"Not connected to Extras"**: Ignore this. This extension runs standalone.
