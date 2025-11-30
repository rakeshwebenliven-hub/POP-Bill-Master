import { GoogleGenAI, Type } from "@google/genai";
import { ParsedBillItem } from "../types";

// This service is currently unused as Voice Entry uses local parsing.
// Keeping structure safe for potential future re-enabling.

const getApiKey = (): string => {
  // Use import.meta.env for Vite or fallback
  return (import.meta as any).env?.VITE_API_KEY || '';
};

export const parseVoiceInput = async (transcript: string): Promise<ParsedBillItem | null> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API Key not found - AI features disabled");
    return null;
  }

  // ... (Rest of logic disabled to prevent errors if called without key)
  return null;
};