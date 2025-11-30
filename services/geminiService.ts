import { GoogleGenAI, Type } from "@google/genai";
import { ParsedBillItem } from "../types";

// Helper to get safe API key
const getApiKey = (): string => {
  return process.env.API_KEY || '';
};

export const parseVoiceInput = async (transcript: string): Promise<ParsedBillItem | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API Key not found");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this voice transcript for a POP construction bill item: "${transcript}".
      
      Extract the following details:
      1. Description: The full descriptive name of the work area or design (e.g., "POP design for main hall ceiling", "Kitchen PVC Panel", "Bedroom cornice"). Translate Hindi terms to English, but keep specific design names if clear.
      2. Dimensions (Length & Width): Look for patterns like "10 by 12", "10x12", "10 into 12". 
         - If the user specifies "running feet", "rft", or implies a linear measurement (like for borders, patti, cornice), treat the single number as Length and set Width to 1.
         - If only one number is found and it's not clearly linear, assume it's an area or default to Length with Width=1.
      3. Quantity: Look for number of items, pieces, or count (e.g., "2 pieces", "4 nos", "2 jagah", "2 times"). Default to 1 if not specified.
      4. Rate: Identify the price per unit (e.g., "at 50", "50 rupees", "@ 50").
      5. Floor: Check if the user mentioned a floor level (e.g., "Ground floor", "1st floor", "First floor", "Basement", "Terrace"). Normalize to "Ground Floor", "1st Floor", etc.
      
      Examples:
      - "First floor Main hall POP design 15 by 20 2 pieces rate 85" -> { description: "Main hall POP design", length: 15, width: 20, quantity: 2, rate: 85, floor: "1st Floor" }
      - "Ground floor Bedroom border 45 feet at 25 rupees" -> { description: "Bedroom border", length: 45, width: 1, quantity: 1, rate: 25, floor: "Ground Floor" }
      - "Kitchen ceiling 10 by 10 price 60" -> { description: "Kitchen ceiling", length: 10, width: 10, quantity: 1, rate: 60 }
      
      If values are missing, use 0 for numbers (except quantity, default 1).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Detailed description of the work/area" },
            length: { type: Type.NUMBER, description: "Length in feet" },
            width: { type: Type.NUMBER, description: "Width in feet (default 1 for RFT)" },
            quantity: { type: Type.NUMBER, description: "Quantity or number of items (default 1)" },
            rate: { type: Type.NUMBER, description: "Rate per unit" },
            floor: { type: Type.STRING, description: "Floor level if specified" }
          },
          required: ["description", "length", "width", "quantity", "rate"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as ParsedBillItem;
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};