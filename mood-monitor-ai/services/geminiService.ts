
import { GoogleGenAI, Type } from "@google/genai";
import { Mood, MoodAnalysis } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const moodAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    mood: {
      type: Type.STRING,
      enum: Object.values(Mood),
      description: "The dominant mood detected in the facial expression.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "A confidence score from 0.0 to 1.0 for the detected mood.",
    },
  },
  required: ["mood", "confidence"],
};

const suggestionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 3-5 brief, actionable tips or preventive measures."
        }
    },
    required: ["suggestions"],
};


export const analyzeFacialExpression = async (base64Image: string): Promise<MoodAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: "Analyze the user's facial expression in this image. Determine the primary mood from the following options: Happy, Sad, Angry, Surprised, Neutral, Anxious. Respond with your analysis in the specified JSON format."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: moodAnalysisSchema,
        temperature: 0.2,
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);

    if (Object.values(Mood).includes(result.mood as Mood)) {
        return {
            mood: result.mood as Mood,
            confidence: result.confidence
        };
    } else {
        return { mood: Mood.Unknown, confidence: 0 };
    }
    
  } catch (error) {
    console.error("Error analyzing facial expression:", error);
    return { mood: Mood.Unknown, confidence: 0 };
  }
};

export const getPreventiveMeasures = async (mood: Mood): Promise<string[]> => {
  if (mood === Mood.Unknown || mood === Mood.Neutral || mood === Mood.Surprised) {
    return [];
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user's current mood is detected as '${mood}'. Please provide 3-5 brief, positive, and actionable suggestions or preventive measures to help them maintain or improve their well-being. Frame them as gentle recommendations. Respond in the specified JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestionsSchema,
        temperature: 0.8,
      },
    });
    
    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    return result.suggestions || [];
  } catch (error) {
    console.error("Error getting preventive measures:", error);
    return ["Could not fetch suggestions at this time. Please try again."];
  }
};
