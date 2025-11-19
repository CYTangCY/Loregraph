export interface EmotionalAxes {
  love: number;       // Romantic Love / Affection (-100 to 100)
  friendship: number; // Platonic Camaraderie (-100 to 100)
  kinship: number;    // Family / Blood Ties / Sworn Loyalty (-100 to 100)
  trust: number;      // Reliability (-100 to 100)
  fear: number;       // Threat Perception (-100 to 100)
  respect: number;    // Competence View (-100 to 100)
  desire: number;     // Physical/Sexual Lust (-100 to 100)
  discipline: number; // Duty / Adherence to Rules (-100 to 100)
  power: number;      // Dominance vs Submission (-100 to 100)
}

export interface CausalEvent {
  description: string;
  affectedAxes: Partial<EmotionalAxes>; 
  timestamp?: string; 
  tone?: 'SERIOUS' | 'JOKING' | 'SARCASM' | 'DECEPTIVE';
}

export interface ActionProbability {
  action: string;       // e.g. "Confess Love", "Attack", "Ignore"
  probability: number;  // 0-100%
  formula: string;      // Explanation: "High Love(80)*0.5 + Dice(15)"
}

export interface CharacterNode {
  id: string;
  name: string;
  archetype: string;
  currentMood: string;
  group: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface RelationshipLink {
  source: string; // D3 uses object reference after sim start, but string initially
  target: string;
  
  // Complex Psychological Profile
  emotions: EmotionalAxes;
  dominantEmotion: keyof EmotionalAxes; 
  
  // The calculated result
  strategicIntent: string; // Summary of stance (e.g. "Hostile", "Romance")
  potentialActions: ActionProbability[]; // Calculated client-side
  
  history: CausalEvent[];
  summary: string;
}

export interface GraphData {
  nodes: CharacterNode[];
  links: RelationshipLink[];
}