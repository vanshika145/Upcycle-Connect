import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '@/config/firebase';
import { authAPI, User, removeAuthToken } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: {
    name: string;
    role: 'provider' | 'seeker';
    organization?: string;
    college?: string;
    latitude: number;
    longitude: number;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (userData?: {
    role?: 'provider' | 'seeker';
    organization?: string;
    college?: string;
    latitude: number;
    longitude: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get user's current location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          // Default to a fallback location if geolocation fails
          console.warn('Geolocation error:', error);
          resolve({
            latitude: 0,
            longitude: 0,
          });
        }
      );
    });
  };

  // Sign up with email/password
  const signUp = async (
    email: string,
    password: string,
    userData: {
      name: string;
      role: 'provider' | 'seeker';
      organization?: string;
      college?: string;
      latitude: number;
      longitude: number;
    }
  ) => {
    try {
      setLoading(true);
      
      // Create user in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Register user in backend
      const response = await authAPI.register(
        {
          name: userData.name,
          email,
          role: userData.role,
          organization: userData.organization,
          college: userData.college,
          latitude: userData.latitude,
          longitude: userData.longitude,
        },
        idToken
      );

      setUser(response.user);
      toast.success('Account created successfully!');
      
      // Navigate to appropriate dashboard
      if (response.user.role === 'provider') {
        navigate('/provider-dashboard');
      } else {
        navigate('/seeker-dashboard');
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Login to backend
      const response = await authAPI.login({ email }, idToken);
      
      setUser(response.user);
      toast.success('Logged in successfully!');
      
      // Navigate to appropriate dashboard
      if (response.user.role === 'provider') {
        navigate('/provider-dashboard');
      } else {
        navigate('/seeker-dashboard');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to log in');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (userData?: {
    role?: 'provider' | 'seeker';
    organization?: string;
    college?: string;
    latitude: number;
    longitude: number;
  }) => {
    try {
      setLoading(true);
      
      // Sign in with Google via Firebase
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      // Get location if not provided
      const location = userData?.latitude && userData?.longitude
        ? { latitude: userData.latitude, longitude: userData.longitude }
        : await getCurrentLocation();

      // Sign in to backend
      const response = await authAPI.googleSignIn(
        {
          name: result.user.displayName || 'Google User',
          email: result.user.email || '',
          role: userData?.role,
          organization: userData?.organization,
          college: userData?.college,
          latitude: location.latitude,
          longitude: location.longitude,
        },
        idToken
      );

      setUser(response.user);
      toast.success('Signed in with Google!');
      
      // Navigate to appropriate dashboard
      if (response.user.role === 'provider') {
        navigate('/provider-dashboard');
      } else {
        navigate('/seeker-dashboard');
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      removeAuthToken();
      setUser(null);
      setFirebaseUser(null);
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get fresh token
          const idToken = await firebaseUser.getIdToken();
          
          // Fetch user data from backend
          const response = await authAPI.getMe();
          setUser(response.user);
        } catch (error) {
          console.error('Error fetching user data:', error);
          // If token is invalid, sign out
          await firebaseSignOut(auth);
          removeAuthToken();
          setUser(null);
        }
      } else {
        setUser(null);
        removeAuthToken();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

