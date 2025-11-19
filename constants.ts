
import { EmotionalAxes } from "./types";

// Action Definitions: The "Weight Matrix" for specific behaviors.
// Values (-1.0 to 1.0) represent how much an emotion drives this action.
export const ACTION_LIBRARY: Record<string, Partial<EmotionalAxes>> = {
    // --- AGGRESSION ---
    "ATTACK": { fear: 0.4, power: 0.8, love: -1.0, friendship: -0.8, discipline: 0.2 },
    "INTIMIDATE": { power: 0.9, fear: 0.5, respect: 0.3, friendship: -0.5 },
    "BETRAY": { trust: -0.5, desire: 0.2, power: 0.6, kinship: -1.0 },
    
    // --- ROMANCE ---
    "KISS": { love: 0.9, desire: 0.8, trust: 0.5, fear: -0.2 },
    "FLIRT": { desire: 0.7, love: 0.3, friendship: 0.4, discipline: -0.2 },
    "CONFESS_LOVE": { love: 1.0, trust: 0.8, fear: 0.3 }, // Fear is positive here (nervousness)

    // --- DIPLOMACY / SOCIAL ---
    "TRUST_CONFIDE": { trust: 1.0, friendship: 0.7, kinship: 0.6, fear: -0.5 },
    "MAKE_DEAL": { respect: 0.8, trust: 0.4, power: 0.1, discipline: 0.5 },
    "ASK_HELP": { trust: 0.8, power: -0.4, friendship: 0.6 },

    // --- HIERARCHY ---
    "OBEY_ORDER": { discipline: 1.0, fear: 0.4, respect: 0.6, power: -0.5 },
    "REBEL": { discipline: -1.0, power: 0.7, fear: -0.3 },
    "PROTECT": { love: 0.6, kinship: 0.9, discipline: 0.5, fear: 0.2 }
};

// Which actions are available for which "Strategic Intent" (returned by LLM)
export const STRATEGY_MAPPING: Record<string, string[]> = {
    "HOSTILE": ["ATTACK", "INTIMIDATE", "BETRAY", "REBEL"],
    "ROMANTIC": ["KISS", "FLIRT", "CONFESS_LOVE", "PROTECT"],
    "FRIENDLY": ["TRUST_CONFIDE", "ASK_HELP", "PROTECT", "MAKE_DEAL"],
    "PROFESSIONAL": ["MAKE_DEAL", "OBEY_ORDER", "RESPECT", "ASK_HELP"],
    "NEUTRAL": ["MAKE_DEAL", "ASK_HELP"],
    "DOMINANT": ["INTIMIDATE", "OBEY_ORDER", "ATTACK"],
    "SUBMISSIVE": ["OBEY_ORDER", "ASK_HELP", "TRUST_CONFIDE"]
};

// Archetype Bonuses: Fixed constant additions to calculations
export const ARCHETYPE_MODIFIERS: Record<string, Partial<EmotionalAxes>> = {
    "Paladin": { discipline: 20, trust: 10 },
    "Rogue": { discipline: -20, trust: -10 },
    "Beserker": { power: 20, fear: -20 },
    "Lover": { love: 20, desire: 20 },
    "Leader": { power: 15, respect: 15 }
};
