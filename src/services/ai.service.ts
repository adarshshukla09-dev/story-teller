import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

// Created lazily so importing this module never throws when GEMINI_API_KEY is absent.
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required.");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

const textModel = () => process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const imageModel = () => process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";

export async function textAi(contents: string): Promise<string> {
  const response = await getClient().models.generateContent({ model: textModel(), contents });
  return response.text ?? "";
}

export async function imageAi(contents: string): Promise<string> {
  const response = await getClient().models.generateContent({ model: imageModel(), contents });
  return response.text ?? "";
}
