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
export const getFreshToken = async (): Promise<string | null> => {
  try {
    // Wait for auth to be ready if currentUser is null
    let currentUser = auth.currentUser;
    
    if (!currentUser) {
      // Wait a bit for auth state to sync
      await new Promise(resolve => setTimeout(resolve, 100));
      currentUser = auth.currentUser;
    }
    
    if (currentUser) {
      // Get fresh token (Firebase automatically refreshes if needed)
      const token = await currentUser.getIdToken(true); // Force refresh
      setAuthToken(token);
      return token;
    }
    
    // If still no user, check localStorage for cached token
    const cachedToken = getAuthToken();
    if (cachedToken) {
      console.warn('⚠️ Using cached token - Firebase user not available');
      return cachedToken;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting fresh token:', error);
    // Fallback to cached token
    const cachedToken = getAuthToken();
    return cachedToken;
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
  price: number;
  priceUnit: 'per_unit' | 'per_kg' | 'per_box' | 'per_set' | 'total';
  images: MaterialImage[];
  providerId: string;
  provider?: {
    name: string;
    email: string;
    organization?: string;
    averageRating?: number;
    totalReviews?: number;
  };
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  status: 'available' | 'requested' | 'picked';
  createdAt: string;
  distance?: number; // Distance in kilometers (from getNearby API)
}

export interface CreateMaterialData {
  title: string;
  category: string;
  description?: string;
  quantity: string;
  price: number;
  priceUnit: 'per_unit' | 'per_kg' | 'per_box' | 'per_set' | 'total';
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
    formData.append('price', data.price.toString());
    formData.append('priceUnit', data.priceUnit);
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

// Request interfaces
export interface MaterialRequest {
  id: string;
  material: {
    id: string;
    title: string;
    category: string;
    quantity: string;
    price?: number;
    priceUnit?: 'per_unit' | 'per_kg' | 'per_box' | 'per_set' | 'total';
    images?: MaterialImage[];
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
    status: string;
  };
  seeker?: {
    id: string;
    name: string;
    email: string;
    college?: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  provider?: {
    id: string;
    name: string;
    email: string;
    organization?: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  quantity: string; // Requested quantity
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  orderStatus: 'pending' | 'approved' | 'paid' | 'dispatched' | 'received';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentId?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  approvedAt?: string;
  paidAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestData {
  materialId: string;
  quantity: string;
  message?: string;
}

// Request API functions
export const requestAPI = {
  // Create a new request (Seeker sends request to Provider)
  create: async (data: CreateRequestData): Promise<{ message: string; request: MaterialRequest }> => {
    return apiRequest<{ message: string; request: MaterialRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  // Get all requests for a provider (incoming requests)
  getProviderRequests: async (): Promise<{ requests: MaterialRequest[] }> => {
    return apiRequest<{ requests: MaterialRequest[] }>('/api/requests/provider', {
      method: 'GET',
    }, true);
  },

  // Get all requests for a seeker (outgoing requests)
  getSeekerRequests: async (): Promise<{ requests: MaterialRequest[] }> => {
    return apiRequest<{ requests: MaterialRequest[] }>('/api/requests/seeker', {
      method: 'GET',
    }, true);
  },

  // Update request status (approve or reject)
  updateStatus: async (
    requestId: string,
    status: 'approved' | 'rejected'
  ): Promise<{ message: string; request: MaterialRequest }> => {
    return apiRequest<{ message: string; request: MaterialRequest }>(`/api/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, true);
  },

  // Create Razorpay order
  createPaymentOrder: async (
    requestId: string
  ): Promise<{ message: string; order: { id: string; amount: number; currency: string; receipt: string }; keyId: string }> => {
    return apiRequest<{ message: string; order: { id: string; amount: number; currency: string; receipt: string }; keyId: string }>(
      '/api/payments/create-order',
      {
        method: 'POST',
        body: JSON.stringify({ requestId }),
      },
      true
    );
  },

  // Verify Razorpay payment
  verifyPayment: async (
    requestId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  ): Promise<{ message: string; request: { id: string; orderStatus: string; paymentStatus: string; paymentId: string } }> => {
    return apiRequest<{ message: string; request: { id: string; orderStatus: string; paymentStatus: string; paymentId: string } }>(
      '/api/payments/verify',
      {
        method: 'POST',
        body: JSON.stringify({
          requestId,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        }),
      },
      true
    );
  },

  // Dispatch order (provider dispatches after payment)
  dispatchOrder: async (
    requestId: string
  ): Promise<{ message: string; request: { id: string; orderStatus: string; dispatchedAt: string; invoiceNumber: string } }> => {
    return apiRequest<{ message: string; request: { id: string; orderStatus: string; dispatchedAt: string; invoiceNumber: string } }>(
      `/api/requests/${requestId}/dispatch`,
      {
        method: 'POST',
      },
      true
    );
  },

  // Mark order as received (seeker confirms receipt)
  receiveOrder: async (
    requestId: string
  ): Promise<{ message: string; request: { id: string; orderStatus: string; receivedAt: string } }> => {
    return apiRequest<{ message: string; request: { id: string; orderStatus: string; receivedAt: string } }>(
      `/api/requests/${requestId}/receive`,
      {
        method: 'POST',
      },
      true
    );
  },

  // Generate and download invoice (returns PDF blob)
  getInvoice: async (
    requestId: string
  ): Promise<Blob> => {
    const token = await getFreshToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/requests/${requestId}/invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.blob();
  },
};

// Impact Analytics API
export const impactAPI = {
  // Get seeker impact summary
  getSeekerSummary: async (): Promise<{
    totalMaterialsReused: number;
    totalCO2Saved: number;
    totalMoneySaved: number;
    categoryWiseBreakdown: Array<{
      category: string;
      materialsReused: number;
      co2Saved: number;
      moneySaved: number;
      wasteDiverted: number;
      quantityReused: number;
    }>;
    categoryDistribution: Array<{
      category: string;
      percentage: number;
      wasteDiverted: number;
    }>;
  }> => {
    return apiRequest<{
      totalMaterialsReused: number;
      totalCO2Saved: number;
      totalMoneySaved: number;
      categoryWiseBreakdown: Array<{
        category: string;
        materialsReused: number;
        co2Saved: number;
        moneySaved: number;
        wasteDiverted: number;
        quantityReused: number;
      }>;
      categoryDistribution: Array<{
        category: string;
        percentage: number;
        wasteDiverted: number;
      }>;
    }>(
      '/api/impact/seeker/summary',
      {
        method: 'GET',
      },
      true
    );
  },

  // Get provider impact summary
  getProviderSummary: async (): Promise<{
    totalWasteDiverted: number;
    totalCO2Saved: number;
    peopleHelped: number;
    categoryWiseWaste: Array<{
      category: string;
      wasteDiverted: number;
      materialsCount: number;
    }>;
    categoryWiseCO2: Array<{
      category: string;
      co2Saved: number;
    }>;
  }> => {
    return apiRequest<{
      totalWasteDiverted: number;
      totalCO2Saved: number;
      peopleHelped: number;
      categoryWiseWaste: Array<{
        category: string;
        wasteDiverted: number;
        materialsCount: number;
      }>;
      categoryWiseCO2: Array<{
        category: string;
        co2Saved: number;
      }>;
    }>(
      '/api/impact/provider/summary',
      {
        method: 'GET',
      },
      true
    );
  },

  // Get provider CO₂ trend over time
  getProviderCO2Trend: async (): Promise<{
    trend: Array<{
      year: number;
      month: number;
      monthName: string;
      label: string;
      co2Saved: number;
      wasteDiverted: number;
      materialsCount: number;
    }>;
    totalCO2Saved: number;
  }> => {
    return apiRequest<{
      trend: Array<{
        year: number;
        month: number;
        monthName: string;
        label: string;
        co2Saved: number;
        wasteDiverted: number;
        materialsCount: number;
      }>;
      totalCO2Saved: number;
    }>(
      '/api/impact/provider/co2-trend',
      {
        method: 'GET',
      },
      true
    );
  },
};

// Analytics API - Dynamic chart data from MongoDB aggregations
export const analyticsAPI = {
  // Get category-wise waste reuse breakdown (global)
  getCategoryBreakdown: async (): Promise<
    Array<{
      category: string;
      total: number;
      count: number;
    }>
  > => {
    return apiRequest<Array<{ category: string; total: number; count: number }>>(
      '/api/analytics/category-breakdown',
      {
        method: 'GET',
      },
      false // Public endpoint
    );
  },

  // Get month-wise CO₂ reduction (global)
  getCO2Monthly: async (): Promise<
    Array<{
      year: number;
      month: number;
      co2: number;
      count: number;
    }>
  > => {
    return apiRequest<
      Array<{
        year: number;
        month: number;
        co2: number;
        count: number;
      }>
    >(
      '/api/analytics/co2-monthly',
      {
        method: 'GET',
      },
      false // Public endpoint
    );
  },

  // Get provider-specific monthly impact
  getProviderMonthly: async (providerId: string): Promise<
    Array<{
      year: number;
      month: number;
      materialsCount: number;
      totalQuantity: number;
    }>
  > => {
    return apiRequest<
      Array<{
        year: number;
        month: number;
        materialsCount: number;
        totalQuantity: number;
      }>
    >(
      `/api/analytics/provider/${providerId}/monthly`,
      {
        method: 'GET',
      },
      true // Requires authentication
    );
  },
};

// Notification API
export interface Notification {
  id: string;
  type: 'REQUEST' | 'PAYMENT' | 'ORDER' | 'APPROVED' | 'DISPATCHED';
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    requestId?: string;
    materialId?: string;
    paymentId?: string;
  };
}

export const notificationAPI = {
  // Get all notifications for authenticated user
  getNotifications: async (): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> => {
    return apiRequest<{
      notifications: Notification[];
      unreadCount: number;
    }>(
      '/api/notifications',
      {
        method: 'GET',
      },
      true
    );
  },

  // Mark a notification as read
  markAsRead: async (notificationId: string): Promise<{ message: string; notification: Notification }> => {
    return apiRequest<{ message: string; notification: Notification }>(
      `/api/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
      },
      true
    );
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<{ message: string; updatedCount: number }> => {
    return apiRequest<{ message: string; updatedCount: number }>(
      '/api/notifications/read-all',
      {
        method: 'PATCH',
      },
      true
    );
  },
};

// AI Search API
export const aiSearchAPI = {
  // AI-powered material search
  search: async (
    query: string,
    latitude?: number,
    longitude?: number,
    radius?: number
  ): Promise<{
    query: string;
    categories: Array<{ name: string; weight: number; reason: string }>;
    materials: Material[];
    count: number;
    aiAnalysis: any;
  }> => {
    return apiRequest<{
      query: string;
      categories: string[];
      materials: Material[];
      count: number;
    }>(
      '/api/search/ai',
      {
        method: 'POST',
        body: JSON.stringify({
          query,
          latitude,
          longitude,
          radius: radius || 50,
        }),
      },
      true
    );
  },
};

// Review API
export interface ProviderReview {
  id: string;
  rating: number;
  review?: string;
  seeker: {
    name: string;
    college?: string;
  };
  createdAt: string;
}

export const reviewAPI = {
  // Create a review for a provider
  createReview: async (
    exchangeId: string,
    rating: number,
    review?: string
  ): Promise<{ message: string; review: ProviderReview }> => {
    return apiRequest<{ message: string; review: ProviderReview }>(
      '/api/reviews',
      {
        method: 'POST',
        body: JSON.stringify({
          exchangeId,
          rating,
          review,
        }),
      },
      true
    );
  },

  // Get reviews for a provider
  getProviderReviews: async (providerId: string): Promise<{ reviews: ProviderReview[] }> => {
    return apiRequest<{ reviews: ProviderReview[] }>(
      `/api/reviews/provider/${providerId}`,
      {
        method: 'GET',
      },
      false
    );
  },
};

