# LoreGraph - Emotional Memory Extension

A **Graph Neural Network** style memory visualization for SillyTavern that tracks relationships, detects tone (Serious vs Joking), and **automatically injects** long-term emotional context back into your chat.

## Features
1.  **Visual Graph**: See character relationships evolve in real-time (9-Axis Emotional Matrix).
2.  **Auto-Update**: The graph analyzes chat logs automatically as you type.
3.  **Memory Injection**: The graph generates a text summary of all relationships and feeds it into the AI's prompt for the next message.
4.  **God Mode**: Manually override relationships or force events.

## Installation

### Method 1: Install from URL (Recommended)
1.  Open SillyTavern.
2.  Go to **Extensions** -> **Install Extension**.
3.  Paste the GitHub URL of this repository.
4.  Click **Install**.
5.  **Reload SillyTavern**.

### Method 2: Developer Build
1.  Clone repo.
2.  Run `npm install`.
3.  Run `npm run dev` to edit source code in `src/`.

## Setup (IMPORTANT)
1.  After installing, go to **Extensions** -> **Installed Extensions**.
2.  Find **LoreGraph**.
3.  You will see a **Settings Panel** there.
4.  **Enter your Google Gemini API Key**.
5.  Select Model (Gemini 2.5 Flash is recommended for speed).
6.  Click **Save Settings**.

*Note: You do NOT need the SillyTavern Extras API. This runs locally in your browser.*

## Usage
1.  Click the **LoreGraph Button** in the top toolbar (Magic Wand area).
2.  Or type `/loregraph` in chat.
3.  Or open from the Extensions menu.
4.  Just chat! The graph updates automatically.
