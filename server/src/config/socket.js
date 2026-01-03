const { Server } = require('socket.io');
const User = require('../models/User');
const Material = require('../models/Material');

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:8082',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store user socket connections (userId -> socketId)
  const userSockets = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Handle user joining their personal room
    socket.on('join', async (data) => {
      try {
        const { userId } = data;

        if (!userId) {
          console.warn(`⚠️ Join event missing userId from socket ${socket.id}`);
          socket.emit('error', { message: 'User ID is required' });
          return;
        }

        // Join user to their personal room
        socket.join(userId);
        userSockets.set(userId, socket.id);

        console.log(`✅ User ${userId} joined room: ${userId} (socket: ${socket.id})`);

        // Confirm join success
        socket.emit('joined', { userId, message: 'Successfully joined room' });
      } catch (error) {
        console.error('❌ Error handling join event:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      
      // Remove user from map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`✅ User ${userId} removed from socket map`);
          break;
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  // Export helper functions for emitting events
  const socketHelpers = {
    io,
    /**
     * Emit event to a specific user's room
     * @param {string} userId - User ID
     * @param {string} event - Event name
     * @param {object} data - Event data
     */
    emitToUser: (userId, event, data) => {
      if (!userId) {
        console.warn('⚠️ Cannot emit to user: userId is missing');
        return;
      }
      io.to(userId).emit(event, data);
      console.log(`📤 Emitted "${event}" to user ${userId}`);
    },

    /**
     * Find and notify matched seekers when a new material is added
     * @param {object} material - Material document from MongoDB
     * @param {number} maxDistanceKm - Maximum distance in kilometers (default: 10km)
     */
    notifyMatchedSeekers: async (material, maxDistanceKm = 10) => {
      try {
        if (!material || !material.location || !material.location.coordinates) {
          console.warn('⚠️ Cannot find matched seekers: material location is missing');
          return;
        }

        const [materialLng, materialLat] = material.location.coordinates;
        const category = material.category;

        // Find seekers within radius who might be interested
        // Note: This is a simplified matching - you can enhance with user preferences
        const seekers = await User.find({
          role: 'seeker',
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [materialLng, materialLat],
              },
              $maxDistance: maxDistanceKm * 1000, // Convert km to meters
            },
          },
        }).select('_id name email location');

        if (seekers.length === 0) {
          console.log(`ℹ️ No seekers found within ${maxDistanceKm}km of material "${material.title}"`);
          return;
        }

        // Prepare material data for notification
        const materialData = {
          id: material._id.toString(),
          title: material.title,
          category: material.category,
          description: material.description,
          quantity: material.quantity,
          images: material.images,
          location: material.location,
          provider: {
            id: material.providerId._id?.toString() || material.providerId.toString(),
            name: material.providerId.name,
            organization: material.providerId.organization,
          },
          createdAt: material.createdAt,
        };

        // Emit to each matched seeker
        let notifiedCount = 0;
        seekers.forEach((seeker) => {
          const seekerId = seeker._id.toString();
          io.to(seekerId).emit('materialAdded', {
            material: materialData,
            message: `New ${category} material available near you!`,
          });
          notifiedCount++;
        });

        console.log(`✅ Notified ${notifiedCount} seeker(s) about new material: "${material.title}"`);
      } catch (error) {
        console.error('❌ Error notifying matched seekers:', error);
      }
    },
  };

  return socketHelpers;
};

module.exports = { initializeSocket };

