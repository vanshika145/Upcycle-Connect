import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user, firebaseUser } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user || !firebaseUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get server URL from environment or use default
    const serverUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    // Create socket connection
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', newSocket.id);
      setIsConnected(true);

      // Join user's personal room
      if (user.id) {
        newSocket.emit('join', { userId: user.id });
        console.log('✅ Joined room for user:', user.id);
      }
    });

    newSocket.on('joined', (data) => {
      console.log('✅ Successfully joined room:', data);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
      toast.error(error.message || 'Socket connection error');
    });

    // Real-time event listeners
    newSocket.on('materialAdded', (data) => {
      console.log('📦 New material added notification:', data);
      toast.info(data.message || 'New material available near you!', {
        description: `${data.material?.title} - ${data.material?.category}`,
        duration: 5000,
      });
    });

    newSocket.on('requestSent', (data) => {
      console.log('📩 New request received:', data);
      toast.info(data.message || 'New request received!', {
        description: `${data.request?.seeker?.name} requested "${data.request?.material?.title}"`,
        duration: 5000,
      });
    });

    newSocket.on('requestApproved', (data) => {
      console.log('✅ Request approved:', data);
      toast.success(data.message || 'Your request has been approved!', {
        description: `"${data.request?.material?.title}" is ready for pickup`,
        duration: 5000,
      });
    });

    newSocket.on('requestRejected', (data) => {
      console.log('❌ Request rejected:', data);
      toast.error(data.message || 'Your request has been rejected', {
        description: `"${data.request?.material?.title}" is no longer available`,
        duration: 5000,
      });
    });

    newSocket.on('paymentReceived', (data) => {
      console.log('💰 Payment received:', data);
      toast.success(data.message || 'Payment received!', {
        description: `Payment for "${data.request?.material?.title}" has been received`,
        duration: 5000,
      });
    });

    newSocket.on('orderDispatched', (data) => {
      console.log('📦 Order dispatched:', data);
      toast.success(data.message || 'Your order has been dispatched!', {
        description: `"${data.request?.material?.title}" is on its way. Invoice available.`,
        duration: 5000,
      });
    });

    newSocket.on('orderReceived', (data) => {
      console.log('✅ Order received:', data);
      toast.success(data.message || 'Order successfully received!', {
        description: `"${data.request?.material?.title}" has been delivered`,
        duration: 5000,
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user, firebaseUser]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

