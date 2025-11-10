// Shared TypeScript types for both frontend and backend

export interface Therapist {
  _id: string;
  fullName: string;
  email: string;
  specialties: string[];
  experienceYears: number;
  profileImage: string;
}

export interface User {
  _id: string;
  fullName: string;
  email: string;
  role: 'user' | 'therapist';
  profileImage?: string;
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
  maxParticipants?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  isLocal: boolean;
  timestamp?: Date;
}

export interface Appointment {
  _id: string;
  user: string;
  therapist: string;
  date: Date;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  role: 'user' | 'therapist';
}

export interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'therapist';
}

export interface TherapistRegisterForm extends RegisterForm {
  specialties: string[];
  experienceYears: number;
  profileImage?: string;
}
