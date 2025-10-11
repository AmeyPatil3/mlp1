import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Define the shape of your user and auth data
interface User {
  _id: string;
  fullName: string;
  email: string;
  role: 'user' | 'therapist';
  profileImage?: string;
  mobile?: string;
  // Therapist-specific fields, can be optional
  education?: string;
  specialties?: string[];
  experienceYears?: number;
}

interface AuthData {
  token: string;
  user: User;
}

// Define the shape of the context value
interface AuthContextType {
  auth: AuthData | null;
  loading: boolean;
  login: (userData: AuthData) => void;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => void;
}

// Create the context with a typed null value
const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('auth');
      if (storedAuth) {
        setAuth(JSON.parse(storedAuth));
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
      localStorage.removeItem('auth');
    }
    setLoading(false);
  }, []);

  const login = (userData: AuthData) => {
    localStorage.setItem('auth', JSON.stringify(userData));
    setAuth(userData);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAuth(null);
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (auth) {
      const newAuthData = {
        ...auth,
        user: { ...auth.user, ...updatedData },
      };
      localStorage.setItem('auth', JSON.stringify(newAuthData));
      setAuth(newAuthData);
    }
  };

  const value = { auth, loading, login, logout, updateUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context safely
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
