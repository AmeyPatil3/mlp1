
export interface Therapist {
  _id: string;
  fullName: string;
  email: string;
  specialties: string[];
  experienceYears: number;
  profileImage: string;
}

export interface Participant {
    id: string;
    name: string;
    isMuted: boolean;
    isCameraOff: boolean;
}

export interface Room {
  _id: string;
  roomId: string;
  name: string;
  topic: string;
  participantsCount: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  isLocal: boolean;
}
