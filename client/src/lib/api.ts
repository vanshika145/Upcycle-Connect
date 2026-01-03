// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Import Firebase auth to get fresh tokens
import { auth } from '@/config/firebase';

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

// Get fresh Firebase ID token
const getFreshToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Get fresh token (Firebase automatically refreshes if needed)
      const token = await currentUser.getIdToken(true); // Force refresh
      setAuthToken(token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting fresh token:', error);
    return null;
  }
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
  options: RequestInit = {},
  requireAuth: boolean = true
): Promise<T> => {
  // Get fresh token if auth is required
  let token: string | null = null;
  if (requireAuth) {
    token = await getFreshToken();
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
  } else {
    token = getAuthToken();
  }
  
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
    }, true);
  },
};

// Material interfaces
export interface MaterialImage {
  url: string;
  publicId: string;
}

export interface Material {
  id: string;
  title: string;
  category: string;
  description: string;
  quantity: string;
  images: MaterialImage[];
  providerId: string;
  provider?: {
    name: string;
    email: string;
    organization?: string;
  };
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  status: 'available' | 'requested' | 'picked';
  createdAt: string;
}

export interface CreateMaterialData {
  title: string;
  category: string;
  description?: string;
  quantity: string;
  images?: File[]; // Changed to File[] for upload
  latitude: number;
  longitude: number;
}

// Material API functions
export const materialAPI = {
  // Create a new material with file uploads
  create: async (data: CreateMaterialData): Promise<{ message: string; material: Material }> => {
    const token = await getFreshToken();
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Create FormData for multipart/form-data
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('category', data.category);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('quantity', data.quantity);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    // Append image files
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    // Make request with FormData (don't set Content-Type, browser will set it with boundary)
    const response = await fetch(`${API_BASE_URL}/api/materials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser will set it automatically with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get my materials (for providers)
  getMyMaterials: async (): Promise<{ materials: Material[] }> => {
    return apiRequest<{ materials: Material[] }>('/api/materials/my-materials', {
      method: 'GET',
    }, true);
  },

  // Get available materials (for seekers to browse)
  getAvailable: async (category?: string, latitude?: number, longitude?: number): Promise<{ materials: Material[] }> => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (latitude) params.append('latitude', latitude.toString());
    if (longitude) params.append('longitude', longitude.toString());
    
    const queryString = params.toString();
    const url = `/api/materials/available${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<{ materials: Material[] }>(url, {
      method: 'GET',
    }, false); // Public endpoint, no auth required
  },

  // Get material by ID
  getById: async (id: string): Promise<{ material: Material }> => {
    return apiRequest<{ material: Material }>(`/api/materials/${id}`, {
      method: 'GET',
    }, false); // Public endpoint, no auth required
  },

  // Update material status
  updateStatus: async (id: string, status: 'available' | 'requested' | 'picked'): Promise<{ message: string; material: { id: string; status: string } }> => {
    return apiRequest<{ message: string; material: { id: string; status: string } }>(`/api/materials/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, true);
  },

  // Delete material
  delete: async (id: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`/api/materials/${id}`, {
      method: 'DELETE',
    }, true);
  },

  // Get nearby materials (for seekers to discover materials)
  getNearby: async (
    latitude: number,
    longitude: number,
    radius: number = 10,
    category?: string
  ): Promise<{ materials: Material[]; count: number; searchLocation: { latitude: number; longitude: number; radius: number } }> => {
    // Validate coordinates before making request
    if (latitude === 0 && longitude === 0) {
      throw new Error('Invalid coordinates: (0,0) is not a valid location');
    }
    
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Invalid coordinate ranges');
    }

    const params = new URLSearchParams();
    params.append('lat', latitude.toString());
    params.append('lng', longitude.toString());
    params.append('radius', radius.toString());
    if (category && category !== 'All') {
      params.append('category', category);
    }
    
    console.log('🔍 Fetching nearby materials:', { latitude, longitude, radius, category });
    
    const url = `/api/materials/nearby?${params.toString()}`;
    
    return apiRequest<{ materials: Material[]; count: number; searchLocation: { latitude: number; longitude: number; radius: number } }>(url, {
      method: 'GET',
    }, false); // Public endpoint, no auth required
  },
};

