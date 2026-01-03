/**
 * Real-time Notification Routes
 *
 * This file handles routes for real-time notifications:
 * - Server-Sent Events (SSE) endpoint
 * - WebSocket connection status endpoint
 * - Real-time notification statistics
 * - Connection management endpoints
 */

import express from 'express';
import sseService from '../services/notification/sse.service.js';
import socketIOService from '../services/notification/socketio.service.js';
import realtimeEventHandlerService from '../services/notification/realtimeEventHandler.service.js';
import { createRateLimitMiddleware } from '../middleware/notification/realtimeAuth.middleware.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
  handleControllerError,
} from '../utils/metrics/responseFormatter.util.js';

const router = express.Router();

// Apply rate limiting middleware
router.use(createRateLimitMiddleware());

/**
 * Setup Server-Sent Events connection
 * GET /api/notifications/realtime/sse
 */
export const setupSSEConnection = async (req, res) => {
  try {
    // Setup SSE connection
    await sseService.setupConnection(req, res);
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get real-time connection statistics
 * GET /api/notifications/realtime/stats
 */
export const getRealtimeStats = async (req, res) => {
  try {
    // Get WebSocket stats
    const websocketStats = socketIOService.getServerStats();

    // Get SSE stats
    const sseStats = sseService.getConnectionStats();

    // Get event handler stats
    const eventHandlerStats = realtimeEventHandlerService.getStats();

    const stats = {
      websocket: websocketStats,
      sse: sseStats,
      eventHandler: eventHandlerStats,
      combined: {
        totalConnections:
          (websocketStats?.connectedSockets || 0) +
          (sseStats?.totalConnections || 0),
        totalUsers:
          (websocketStats?.totalUsers || 0) + (sseStats?.totalUsers || 0),
        timestamp: new Date().toISOString(),
      },
    };

    return res.json(formatSuccessResponse(stats, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get WebSocket room information
 * GET /api/notifications/realtime/rooms/:roomName
 */
export const getRoomInfo = async (req, res) => {
  try {
    const { roomName } = req.params;

    if (!roomName) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'INVALID_ROOM',
          message: 'Room name is required',
        })
      );
    }

    const roomInfo = socketIOService.getRoomInfo(roomName);

    if (!roomInfo) {
      return res.status(404).json(
        formatErrorResponse({
          code: 'ROOM_NOT_FOUND',
          message: 'Room not found',
        })
      );
    }

    return res.json(formatSuccessResponse(roomInfo, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get all WebSocket rooms
 * GET /api/notifications/realtime/rooms
 */
export const getAllRooms = async (req, res) => {
  try {
    const rooms = socketIOService.getAllRooms();
    return res.json(formatSuccessResponse(rooms, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Send test notification via real-time channels
 * POST /api/notifications/realtime/test
 */
export const sendTestNotification = async (req, res) => {
  try {
    const { userId, notification } = req.body;

    if (!userId || !notification) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'INVALID_REQUEST',
          message: 'User ID and notification are required',
        })
      );
    }

    // Process notification for real-time delivery
    const result = await realtimeEventHandlerService.processNotification(
      notification.id || 'test',
      {
        userId,
        ...notification,
        deliveryMethod: 'both',
      }
    );

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Test notification sent via real-time channels',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Handle notification action via real-time channels
 * POST /api/notifications/realtime/action
 */
export const handleNotificationAction = async (req, res) => {
  try {
    const { notificationId, action, payload } = req.body;
    const userId = req.user?.id || req.body.userId;

    if (!notificationId || !action || !userId) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'INVALID_REQUEST',
          message: 'Notification ID, action, and user ID are required',
        })
      );
    }

    // Handle the notification action
    const result = await realtimeEventHandlerService.handleNotificationAction(
      notificationId,
      userId,
      action,
      payload
    );

    return res.json(
      formatSuccessResponse(result, req, {
        message: 'Notification action processed successfully',
      })
    );
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Define routes
router.get('/sse', setupSSEConnection);
router.get('/stats', getRealtimeStats);
router.get('/rooms/:roomName', getRoomInfo);
router.get('/rooms', getAllRooms);
router.post('/test', sendTestNotification);
router.post('/action', handleNotificationAction);

export default router;
