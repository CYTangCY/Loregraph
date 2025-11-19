
import { GoogleGenAI, Type } from "@google/genai";
import { GraphData, EmotionalAxes, CharacterNode, RelationshipLink, ActionProbability } from "../types";
import { ACTION_LIBRARY, STRATEGY_MAPPING, ARCHETYPE_MODIFIERS } from "../constants";

// --- MATRIX MATH HELPERS ---

const dotProduct = (emotions: EmotionalAxes, weights: Partial<EmotionalAxes>): number => {
  let score = 0;
  const keys = Object.keys(emotions) as (keyof EmotionalAxes)[];
  for (const key of keys) {
    const val = emotions[key] || 0;
    const weight = weights[key] || 0;
    score += val * weight;
  }
  return score;
};

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

// --- API CLIENT ---

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

// --- SIMPLIFIED LLM RESPONSE TYPES ---

interface RawLinkUpdate {
  sourceId: string;
  targetId: string;
  newEmotions: EmotionalAxes; 
  historyEvent: string;
  strategicIntent: string; 
  contextScore: number; 
  tone: 'SERIOUS' | 'JOKING' | 'SARCASM' | 'DECEPTIVE'; // New Tone Field
}

interface RawResponse {
  nodes: CharacterNode[];
  linkUpdates: RawLinkUpdate[];
}

// --- PROCEDURAL GENERATOR ---

const calculateProceduralActions = (
    emotions: EmotionalAxes, 
    intent: string, 
    contextScore: number
): ActionProbability[] => {
    const availableActionKeys = STRATEGY_MAPPING[intent.toUpperCase()] || STRATEGY_MAPPING["NEUTRAL"];

    return availableActionKeys.map(actionKey => {
        const weights = ACTION_LIBRARY[actionKey];
        if (!weights) return { action: actionKey, probability: 0, formula: "Unknown Action" };

        const dotProd = dotProduct(emotions, weights);
        const diceRoll = Math.floor(Math.random() * 20) + 1;

        const rawScore = dotProd + contextScore + (diceRoll * 2); 
        const probability = clamp(Math.round(((rawScore + 150) / 300) * 100), 0, 100);

        const contributors = Object.entries(weights)
            .sort(([,a], [,b]) => Math.abs(b || 0) - Math.abs(a || 0))
            .slice(0, 2)
            .map(([k, w]) => `${k.slice(0,3).toUpperCase()}(${w})`)
            .join('+');

        return {
            action: actionKey,
            probability,
            formula: `[${contributors}] + Ctx(${contextScore}) + d20`
        };
    }).sort((a, b) => b.probability - a.probability);
};

// --- MAIN ANALYSIS FUNCTION ---

export const analyzeStoryBlock = async (
  textBlock: string, 
  currentGraph: GraphData,
  godModeInstruction?: string
): Promise<GraphData> => {
  const ai = getAiClient();
  const existingCharList = currentGraph.nodes.map(n => `${n.id} (${n.name})`).join(", ");

  const prompt = `
    LoreGraph Engine v3.0 - Deep Psychological Analysis.

    CHARACTERS: [${existingCharList}]
    INPUT TEXT: "${textBlock}"
    ${godModeInstruction ? `GOD MODE OVERRIDE: "${godModeInstruction}"` : ''}

    *** CRITICAL INSTRUCTIONS FOR SERIOUSNESS ***
    1. **DETECT TONE**: You must identify if the interaction is 'SERIOUS', 'JOKING', 'SARCASM', or 'DECEPTIVE'.
    2. **IGNORE BANTER**: If characters are joking, teasing, or being sarcastic, the 'newEmotions' values MUST NOT change significantly (keep them near current values). 
    3. **ONLY REAL IMPACTS**: Only change values drastically if a genuine, serious event occurred (e.g., betrayal, saving a life, confession).
    4. **SUBTEXT**: If a character says "I hate you" lovingly (Tsundere), increase LOVE, do not increase FEAR/DISLIKE. Analyze the SUBTEXT, not just the text.

    TASK:
    1. Identify character nodes.
    2. For interactions, output 'newEmotions' (absolute 9-axis values -100 to 100).
    3. Determine 'strategicIntent'.
    4. Set 'tone'.
    5. Provide 'contextScore' (-50 to 50).

    Reference Axes: Love, Friendship, Kinship, Trust, Fear, Respect, Desire, Discipline, Power.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  archetype: { type: Type.STRING },
                  currentMood: { type: Type.STRING },
                  group: { type: Type.INTEGER }
                },
                required: ["id", "name", "archetype", "currentMood", "group"]
              }
            },
            linkUpdates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceId: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  newEmotions: {
                    type: Type.OBJECT,
                    properties: {
                      love: { type: Type.INTEGER },
                      friendship: { type: Type.INTEGER },
                      kinship: { type: Type.INTEGER },
                      trust: { type: Type.INTEGER },
                      fear: { type: Type.INTEGER },
                      respect: { type: Type.INTEGER },
                      desire: { type: Type.INTEGER },
                      discipline: { type: Type.INTEGER },
                      power: { type: Type.INTEGER },
                    },
                    required: ["love", "friendship", "kinship", "trust", "fear", "respect", "desire", "discipline", "power"]
                  },
                  strategicIntent: { type: Type.STRING },
                  historyEvent: { type: Type.STRING },
                  contextScore: { type: Type.INTEGER },
                  tone: { type: Type.STRING, enum: ['SERIOUS', 'JOKING', 'SARCASM', 'DECEPTIVE'] }
                },
                required: ["sourceId", "targetId", "newEmotions", "strategicIntent", "historyEvent", "contextScore", "tone"]
              }
            }
          },
          required: ["nodes", "linkUpdates"]
        }
      }
    });

    if (!response.text) throw new Error("No response text from Gemini");
    const rawData = JSON.parse(response.text) as RawResponse;

    // --- MERGE NODES ---
    const newNodes = [...currentGraph.nodes];
    rawData.nodes.forEach(rawNode => {
        const existingIndex = newNodes.findIndex(n => n.id === rawNode.id);
        if (existingIndex >= 0) {
            newNodes[existingIndex] = { ...newNodes[existingIndex], ...rawNode };
        } else {
            newNodes.push(rawNode);
        }
    });

    // --- MERGE LINKS WITH DAMPENING LOGIC ---
    let newLinks = [...currentGraph.links];

    rawData.linkUpdates.forEach(update => {
        let existingLink = newLinks.find(l => l.source === update.sourceId && l.target === update.targetId);
        
        // DAMPENING LOGIC:
        // If the AI says it's a Joke or Sarcasm, we resist the change.
        // We interpolate between the OLD value and the NEW value.
        // Serious = 100% adoption. Joke = 10% adoption.
        let adoptionRate = 1.0;
        if (update.tone === 'JOKING' || update.tone === 'SARCASM') adoptionRate = 0.1;
        if (update.tone === 'DECEPTIVE') adoptionRate = 0.3;

        let finalEmotions = { ...update.newEmotions };

        if (existingLink) {
            (Object.keys(finalEmotions) as (keyof EmotionalAxes)[]).forEach(key => {
                const oldVal = existingLink!.emotions[key];
                const targetVal = update.newEmotions[key];
                // Linear Interpolation
                finalEmotions[key] = Math.round(oldVal + (targetVal - oldVal) * adoptionRate);
            });
        }

        // 1. Identify Dominant Emotion
        let maxVal = -1;
        let dominant: keyof EmotionalAxes = 'trust';
        (Object.keys(finalEmotions) as (keyof EmotionalAxes)[]).forEach(k => {
            if (Math.abs(finalEmotions[k]) > maxVal) {
                maxVal = Math.abs(finalEmotions[k]);
                dominant = k;
            }
        });

        // 2. PROCEDURAL ACTION GENERATION
        const calculatedActions = calculateProceduralActions(
            finalEmotions, 
            update.strategicIntent, 
            update.contextScore
        );

        // 3. Update History with Tone Tag
        const linkIndex = newLinks.findIndex(l => l.source === update.sourceId && l.target === update.targetId);
        const historyEntry = {
            description: update.historyEvent,
            affectedAxes: finalEmotions,
            timestamp: new Date().toLocaleTimeString(),
            tone: update.tone
        };

        const newLinkData: RelationshipLink = {
            source: update.sourceId,
            target: update.targetId,
            emotions: finalEmotions,
            dominantEmotion: dominant,
            strategicIntent: update.strategicIntent,
            potentialActions: calculatedActions,
            summary: update.strategicIntent, 
            history: linkIndex >= 0 ? [...newLinks[linkIndex].history, historyEntry] : [historyEntry]
        };

        if (linkIndex >= 0) {
            newLinks[linkIndex] = newLinkData;
        } else {
            newLinks.push(newLinkData);
        }
    });

    return { nodes: newNodes, links: newLinks };

  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};

// --- DETERMINISTIC EXPORT ---

export const generateSystemPrompt = async (graph: GraphData): Promise<string> => {
   let output = `[RELATIONSHIP GRAPH STATE]\n`;
   
   output += `\n-- CHARACTERS --\n`;
   graph.nodes.forEach(n => {
       output += `[${n.name}]: ${n.currentMood} (Archetype: ${n.archetype})\n`;
   });

   output += `\n-- DYNAMICS --\n`;
   graph.links.forEach(l => {
       const acts = l.potentialActions.slice(0,2).map(a => `${a.action}(${a.probability}%)`).join(", ");
       output += `${l.source} -> ${l.target} [${l.strategicIntent}]:\n`;
       output += `  Dominant: ${l.dominantEmotion.toUpperCase()}\n`;
       output += `  Likely Actions: ${acts}\n`;
       
       const significant = Object.entries(l.emotions)
         .filter(([,v]) => Math.abs(v) > 40)
         .map(([k,v]) => `${k}: ${v}`)
         .join(", ");
       if(significant) output += `  Values: { ${significant} }\n`;
   });

   return output;
};
