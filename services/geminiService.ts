
import { GoogleGenAI, Type } from "@google/genai";
import { GameData, Actor, InteractionType } from "../types";
import { CANVAS_SIZE } from "../constants";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Helper to convert the 8x8 grid from AI into a drawn canvas image
const convertGridToImage = (grid: number[], color: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const pixelSize = CANVAS_SIZE / 8;
  
  // Draw slightly messy
  ctx.fillStyle = color;
  for(let i=0; i<64; i++) {
    if(grid[i] === 1) {
      const x = (i % 8) * pixelSize;
      const y = Math.floor(i / 8) * pixelSize;
      
      // Add some randomness to make it look hand-drawn
      const jitter = () => (Math.random() - 0.5) * (pixelSize * 0.2);
      
      ctx.fillRect(
        x + jitter(), 
        y + jitter(), 
        pixelSize + jitter(), 
        pixelSize + jitter()
      );
    }
  }
  return canvas.toDataURL();
};

export const generateGameIdea = async (prompt: string): Promise<Partial<GameData> | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a simple Sokoban-style puzzle game concept based on this prompt: "${prompt}". 
      Return a JSON object with a list of 3-5 actors (including a Hero) and a list of rules.
      For the sprites, provide a flat array of 64 integers (0 or 1) representing an 8x8 binary pixel grid.
      The output must perfectly match the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            actors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  color: { type: Type.STRING },
                  spriteData: { 
                    type: Type.ARRAY, 
                    items: { type: Type.INTEGER },
                    description: "Array of 64 integers (0 or 1)"
                  }
                },
                required: ["id", "name", "color", "spriteData"]
              }
            },
            rules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subjectId: { type: Type.STRING },
                  objectId: { type: Type.STRING },
                  interaction: { 
                    type: Type.STRING, 
                    enum: ["BLOCK", "PUSH", "DESTROY_OBJECT", "DESTROY_SUBJECT", "WIN", "NOTHING"] 
                  }
                },
                required: ["subjectId", "objectId", "interaction"]
              }
            }
          },
          required: ["title", "actors", "rules"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const result = JSON.parse(text);

    const actors: Actor[] = result.actors.map((a: any) => ({
      id: a.id,
      name: a.name,
      imageData: convertGridToImage(a.spriteData, a.color)
    }));

    const rules = result.rules.map((r: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      scope: 'GLOBAL', // Default to global for AI
      subjectId: r.subjectId,
      objectId: r.objectId,
      trigger: 'COLLISION', // Default trigger for AI
      effects: [{ type: r.interaction as InteractionType }]
    }));

    return {
      title: result.title,
      actors,
      rules,
      scenes: [{ id: 'scene_1', objects: [] }]
    };

  } catch (e) {
    console.error("Gemini generation failed", e);
    return null;
  }
};
