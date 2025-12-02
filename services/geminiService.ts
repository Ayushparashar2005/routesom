import { GoogleGenAI, Type } from "@google/genai";
import { GraphData } from "../types";

// Initialize Gemini Client
// Requires process.env.API_KEY to be set
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateTopology = async (prompt: string): Promise<GraphData | null> => {
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a network topology based on this description: "${prompt}".
      The output must be a JSON object with 'nodes' (array of objects with 'id') and 'links' (array of objects with 'source', 'target', 'weight').
      Ensure 'source' and 'target' match node ids. 'weight' should be an integer between 1 and 20.
      Create realistic looking graphs.
      `,
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
                  id: { type: Type.STRING }
                },
                required: ["id"]
              }
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  weight: { type: Type.INTEGER }
                },
                required: ["source", "target", "weight"]
              }
            }
          },
          required: ["nodes", "links"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      // Assign unique IDs to links
      const linksWithIds = data.links.map((l: any, i: number) => ({
        ...l,
        id: `link-${i}-${Math.random().toString(36).substr(2, 9)}`
      }));
      return {
        nodes: data.nodes,
        links: linksWithIds
      };
    }
  } catch (error) {
    console.error("Failed to generate topology:", error);
  }
  return null;
};
