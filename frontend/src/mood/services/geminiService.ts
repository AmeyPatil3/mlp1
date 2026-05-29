import api from '../../services/api';
import { Mood, MoodAnalysis } from '../types';

export const analyzeFacialExpression = async (base64Image: string): Promise<MoodAnalysis> => {
  try {
    const response = await api.post('/ai/analyze-mood', { base64Image });
    if (response.data && response.data.success && response.data.analysis) {
      const { mood, confidence } = response.data.analysis;
      if (Object.values(Mood).includes(mood as Mood)) {
        return {
          mood: mood as Mood,
          confidence: confidence
        };
      }
    }
    return { mood: Mood.Unknown, confidence: 0 };
  } catch (error) {
    console.error("Error analyzing facial expression via backend:", error);
    return { mood: Mood.Unknown, confidence: 0 };
  }
};

export const getPreventiveMeasures = async (mood: Mood): Promise<string[]> => {
  if (mood === Mood.Unknown || mood === Mood.Neutral || mood === Mood.Surprised) {
    return [];
  }
  
  try {
    const response = await api.post('/ai/suggestions', { mood });
    if (response.data && response.data.success) {
      return response.data.suggestions || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting preventive measures via backend:", error);
    return ["Could not fetch suggestions at this time. Please try again."];
  }
};

export interface ChatMessageParam {
  role: 'user' | 'model';
  text: string;
}

export const chatWithCbtBuddy = async (history: ChatMessageParam[]): Promise<string> => {
  try {
    const response = await api.post('/ai/cbt-buddy', { history });
    if (response.data && response.data.success && response.data.reply) {
      return response.data.reply;
    }
    return "I heard you, but I wasn't able to compile my response. Please share how you're feeling again.";
  } catch (error) {
    console.error("Error communicating with CBT Buddy via backend:", error);
    return "I'm having a brief moment of reflection. Please tell me more, or try sending that message again.";
  }
};

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export const generateSoapNotes = async (summaryText: string): Promise<SoapNote | null> => {
  try {
    const response = await api.post('/ai/generate-notes', { summaryText });
    if (response.data && response.data.success && response.data.notes) {
      return response.data.notes as SoapNote;
    }
    return null;
  } catch (error) {
    console.error("Error generating SOAP notes via backend:", error);
    return null;
  }
};
