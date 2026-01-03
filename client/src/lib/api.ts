// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'provider' | 'seeker' | 'admin';
  organization?: string;
  college?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: string;
}

export interface RegisterData {
  name: string;
  email: string;
  role: 'provider' | 'seeker';
  organization?: string;
  college?: string;
  latitude: number;
  longitude: number;
}

export interface LoginData {
  email: string;
}

export interface GoogleSignInData {
  name: string;
  email: string;
  role?: 'provider' | 'seeker';
  organization?: string;
  college?: string;
  latitude: number;
  longitude: number;
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('firebase_id_token');
};

// Set auth token in localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem('firebase_id_token', token);
};

// Remove auth token from localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem('firebase_id_token');
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Auth API functions
export const authAPI = {
  // Register user with email/password
  register: async (data: RegisterData, idToken: string): Promise<{ message: string; user: User }> => {
    setAuthToken(idToken);
    return apiRequest<{ message: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Login with email/password
  login: async (data: LoginData, idToken: string): Promise<{ message: string; user: User }> => {
    setAuthToken(idToken);
    return apiRequest<{ message: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Google sign-in
  googleSignIn: async (data: GoogleSignInData, idToken: string): Promise<{ message: string; user: User }> => {
    setAuthToken(idToken);
    return apiRequest<{ message: string; user: User }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get current user (protected route)
  getMe: async (): Promise<{ user: User }> => {
    return apiRequest<{ user: User }>('/api/auth/me', {
      method: 'GET',
    });
  },
};

