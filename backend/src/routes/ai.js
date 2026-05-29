import { GoogleGenAI, Type } from "@google/genai";
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const moodAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    mood: {
      type: Type.STRING,
      enum: ["Happy", "Sad", "Angry", "Surprised", "Neutral", "Anxious", "Unknown"],
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

const soapNoteSchema = {
  type: Type.OBJECT,
  properties: {
    subjective: {
      type: Type.STRING,
      description: "Subjective: Summarize the client's self-reported feelings, concerns, symptoms, and coping strategies based on the session summary.",
    },
    objective: {
      type: Type.STRING,
      description: "Objective: Describe objective clinical observations of presentation, affect, engagement, speech pattern, or any measurable indicators.",
    },
    assessment: {
      type: Type.STRING,
      description: "Assessment: Clinical analysis of the current themes, progress, obstacles, or cognitive distortions identified in the session.",
    },
    plan: {
      type: Type.STRING,
      description: "Plan: Collaborative next steps, future therapeutic homework, goals, or targets for the upcoming appointment.",
    },
  },
  required: ["subjective", "objective", "assessment", "plan"],
};

router.post('/analyze-mood', authenticateToken, async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
      return res.status(500).json({ success: false, message: 'Gemini API not configured' });
    }

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

    const result = JSON.parse(response.text.trim());
    res.json({ success: true, analysis: result });
  } catch (error) {
    console.error("Error analyzing facial expression:", error);
    res.status(500).json({ success: false, message: 'Failed to analyze mood' });
  }
});

router.post('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { mood } = req.body;
    if (!mood) {
      return res.status(400).json({ success: false, message: 'Mood is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
      return res.status(500).json({ success: false, message: 'Gemini API not configured' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user's current mood is detected as '${mood}'. Please provide 3-5 brief, positive, and actionable suggestions or preventive measures to help them maintain or improve their well-being. Frame them as gentle recommendations. Respond in the specified JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestionsSchema,
        temperature: 0.8,
      },
    });

    const result = JSON.parse(response.text.trim());
    res.json({ success: true, suggestions: result.suggestions || [] });
  } catch (error) {
    console.error("Error getting suggestions:", error);
    res.status(500).json({ success: false, message: 'Failed to get suggestions' });
  }
});

router.post('/cbt-buddy', authenticateToken, async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ success: false, message: 'Chat history is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
      return res.status(500).json({ success: false, message: 'Gemini API not configured' });
    }

    const systemInstruction = 
      "You are CBT Buddy, a warm, non-diagnostic, compassionate mental health companion. " +
      "You use cognitive behavioral therapy (CBT) reflection principles, validate emotions, help users identify thinking patterns (cognitive distortions like filtering, black-and-white thinking, catastrophizing), and guide them through self-discovery. " +
      "Never prescribe medicine or make clinical diagnoses. Maintain a supportive, active listening, conversational tone. " +
      "Keep responses highly engaging, warm, empathetic, and relatively concise (1-3 paragraphs maximum). Ask one gentle reflective question at the end to keep the dialogue flowing.";

    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ success: true, reply: response.text || "" });
  } catch (error) {
    console.error("Error interacting with CBT Buddy:", error);
    res.status(500).json({ success: false, message: 'CBT Buddy reflection failed' });
  }
});

router.post('/generate-notes', authenticateToken, async (req, res) => {
  try {
    const { summaryText } = req.body;
    if (!summaryText || summaryText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Session summary text is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set.");
      return res.status(500).json({ success: false, message: 'Gemini API not configured' });
    }

    const systemInstruction = 
      "You are a clinical documentation assistant for licensed therapists. Your job is to take raw, rough bullet points or conversational summaries from a therapy session and organize/format them into a professional clinical SOAP note (Subjective, Objective, Assessment, Plan).\n\n" +
      "Maintain a strictly objective, clinical, professional, HIPAA-compliant, and supportive clinical tone. Do not use overly dramatic language. Draft complete, coherent paragraphs for each section based on the details provided. If certain sections have little information, utilize standard professional clinical assumptions (e.g., 'Client presented as cooperative; affect appeared consistent with self-reported mood') while keeping it completely tailored to the input notes.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Draft a professional SOAP note for a client session based on the following raw notes:\n\n"${summaryText}"\n\nRespond strictly in the specified JSON schema format.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: soapNoteSchema,
        temperature: 0.3,
      }
    });

    const result = JSON.parse(response.text.trim());
    res.json({ success: true, notes: result });
  } catch (error) {
    console.error("Error generating clinical SOAP notes:", error);
    res.status(500).json({ success: false, message: 'Failed to generate clinical SOAP notes' });
  }
});

export default router;
