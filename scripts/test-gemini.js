import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';

// Load env from the root directory
dotenv.config({ path: path.resolve('/Users/ameypatil/Desktop/mlp/.env.local') });

let key = process.env.GEMINI_API_KEY;
if (key && key.startsWith('P')) {
  key = key.substring(1);
}
console.log("Using API Key (Stripped P):", key ? `${key.substring(0, 8)}...` : "UNDEFINED");

const ai = new GoogleGenAI({ apiKey: key });

async function run() {
  try {
    const systemInstruction = "You are a helpful assistant.";
    
    // Test case 1: starting with 'model' role (should fail if it's strict)
    console.log("\n--- Running Test 1 (Starts with model role) ---");
    try {
      const res1 = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: 'model', parts: [{ text: 'Hello, how can I help?' }] },
          { role: 'user', parts: [{ text: 'Hi, I need help.' }] }
        ],
        config: { systemInstruction }
      });
      console.log("Test 1 Succeeded:", await res1.text());
    } catch (err1) {
      console.log("Test 1 Failed as expected:", err1.message || err1);
    }

    // Test case 2: starting with 'user' role
    console.log("\n--- Running Test 2 (Starts with user role) ---");
    const res2 = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: 'user', parts: [{ text: 'Hi, I need help managing my stress.' }] }
      ],
      config: { systemInstruction }
    });
    console.log("Test 2 Succeeded:", await res2.text());

  } catch (error) {
    console.error("Test script failed:", error);
  }
}

run();
