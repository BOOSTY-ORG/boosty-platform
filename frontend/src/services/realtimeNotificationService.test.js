/**
 * Unit tests for RealtimeNotificationService
 * Tests WebSocket and SSE connections, event handling, reconnection logic, and edge cases
 */

import { RealtimeNotificationService } from "./realtimeNotificationService.js";
import {
  REALTIME_CONNECTION_TYPES,
  REALTIME_EVENT_TYPES,
  WEBSOCKET_CONFIG,
  SSE_CONFIG,
} from "../api/notificationConstants.js";

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.sentMessages = [];

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ type: "open" });
      }
    }, 10);
  }

  send(data) {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = "") {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: true });
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper method to simulate an error
  simulateError() {
    this.readyState = WebSocket.CLOSED;
    if (this.onerror) {
      this.onerror(new Error("Connection failed"));
    }
  }
}

// Mock EventSource
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = EventSource.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.eventListeners = {};

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      if (this.onopen) {
        this.onopen({ type: "open" });
      }
    }, 10);
  }

  addEventListener(type, listener) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    if (this.eventListeners[type]) {
      const index = this.eventListeners[type].indexOf(listener);
      if (index > -1) {
        this.eventListeners[type].splice(index, 1);
      }
    }
  }

  close() {
    this.readyState = EventSource.CLOSED;
  }

  // Helper method to simulate receiving a message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper method to simulate an error
  simulateError() {
    this.readyState = EventSource.CLOSED;
    if (this.onerror) {
      this.onerror(new Error("Connection failed"));
    }
  }
}

// Mock browser APIs
const mockNotification = {
  permission: "granted",
  requestPermission: jest.fn(() => Promise.resolve("granted")),
};

Object.defineProperty(global, "WebSocket", {
  writable: true,
  value: MockWebSocket,
});

Object.defineProperty(global, "EventSource", {
  writable: true,
  value: MockEventSource,
});

Object.defineProperty(window, "Notification", {
  writable: true,
  value: mockNotification,
});

Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

describe("RealtimeNotificationService", () => {
  let service;
  let userId;

  beforeEach(() => {
    service = new RealtimeNotificationService();
    userId = "test-user-123";
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.disconnect();
    service.cleanup();
  });

  describe("Connection Management", () => {
    test("should connect using WebSocket when specified", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.WEBSOCKET,
      };

      const connected = await service.connect(userId, preferences);

      expect(connected).toBe(true);
      expect(service.isConnected).toBe(true);
      expect(service.connectionType).toBe(REALTIME_CONNECTION_TYPES.WEBSOCKET);
      expect(service.userId).toBe(userId);
    });

    test("should connect using SSE when specified", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      };

      const connected = await service.connect(userId, preferences);

      expect(connected).toBe(true);
      expect(service.isConnected).toBe(true);
      expect(service.connectionType).toBe(REALTIME_CONNECTION_TYPES.SSE);
      expect(service.userId).toBe(userId);
    });

    test("should fallback to SSE when WebSocket fails", async () => {
      // Mock WebSocket to fail
      global.WebSocket = class {
        constructor() {
          throw new Error("WebSocket not supported");
        }
      };

      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.BOTH,
      };
      const connected = await service.connect(userId, preferences);

      expect(connected).toBe(true);
      expect(service.connectionType).toBe(REALTIME_CONNECTION_TYPES.SSE);
    });

    test("should handle connection timeout", async () => {
      // Mock WebSocket to never connect
      global.WebSocket = class {
        constructor() {
          this.readyState = WebSocket.CONNECTING;
          this.onopen = null;
          this.onmessage = null;
          this.onclose = null;
          this.onerror = null;
        }
      };

      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.WEBSOCKET,
      };

      await expect(service.connect(userId, preferences)).rejects.toThrow(
        "WebSocket connection timeout"
      );
      expect(service.isConnected).toBe(false);
    });

    test("should not connect multiple times simultaneously", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      };

      const promise1 = service.connect(userId, preferences);
      const promise2 = service.connect(userId, preferences);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(service.isConnected).toBe(true);
    });

    test("should disconnect properly", () => {
      service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      service.disconnect();

      expect(service.isConnected).toBe(false);
      expect(service.userId).toBe(null);
      expect(service.eventHandlers.size).toBe(0);
    });
  });

  describe("Event Handling", () => {
    test("should handle new notification events", async () => {
      const handler = jest.fn();
      service.subscribe(REALTIME_EVENT_TYPES.NOTIFICATION_NEW, handler);

      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      const notification = {
        id: "notif-123",
        type: "info",
        message: "Test notification",
      };

      service.sseConnection.simulateMessage({
        type: REALTIME_EVENT_TYPES.NOTIFICATION_NEW,
        data: notification,
      });

      expect(handler).toHaveBeenCalledWith(notification);
    });

    test("should handle notification update events", async () => {
      const handler = jest.fn();
      service.subscribe(REALTIME_EVENT_TYPES.NOTIFICATION_UPDATE, handler);

      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      const notification = {
        id: "notif-123",
        read: true,
      };

      service.sseConnection.simulateMessage({
        type: REALTIME_EVENT_TYPES.NOTIFICATION_UPDATE,
        data: notification,
      });

      expect(handler).toHaveBeenCalledWith(notification);
    });

    test("should handle notification delete events", async () => {
      const handler = jest.fn();
      service.subscribe(REALTIME_EVENT_TYPES.NOTIFICATION_DELETE, handler);

      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      const deleteData = { id: "notif-123" };

      service.sseConnection.simulateMessage({
        type: REALTIME_EVENT_TYPES.NOTIFICATION_DELETE,
        data: deleteData,
      });

      expect(handler).toHaveBeenCalledWith(deleteData);
    });

    test("should handle connection status events", async () => {
      const handler = jest.fn();
      service.subscribe(REALTIME_EVENT_TYPES.CONNECTION_STATUS, handler);

      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      const statusData = { status: "connected" };

      service.sseConnection.simulateMessage({
        type: REALTIME_EVENT_TYPES.CONNECTION_STATUS,
        data: statusData,
      });

      expect(handler).toHaveBeenCalledWith(statusData);
    });

    test("should handle malformed events gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      // Send malformed JSON
      service.sseConnection.onmessage({ data: "invalid json" });

      // Send event without type
      service.sseConnection.simulateMessage({ data: { message: "no type" } });

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });
  });

  describe("Subscription Management", () => {
    test("should subscribe and unsubscribe from events", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsubscribe1 = service.subscribe("test-event", handler1);
      const unsubscribe2 = service.subscribe("test-event", handler2);

      expect(service.eventHandlers.has("test-event")).toBe(true);
      expect(service.eventHandlers.get("test-event")).toHaveLength(2);

      unsubscribe1();

      expect(service.eventHandlers.get("test-event")).toHaveLength(1);
      expect(service.eventHandlers.get("test-event")).not.toContain(handler1);

      unsubscribe2();

      expect(service.eventHandlers.has("test-event")).toBe(false);
    });

    test("should handle multiple handlers for same event", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      service.subscribe("test-event", handler1);
      service.subscribe("test-event", handler2);

      service.handleRealtimeEvent({
        type: "test-event",
        data: { test: "data" },
      });

      expect(handler1).toHaveBeenCalledWith({ test: "data" });
      expect(handler2).toHaveBeenCalledWith({ test: "data" });
    });
  });

  describe("Reconnection Logic", () => {
    test("should attempt reconnection on connection loss", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      };

      await service.connect(userId, preferences);

      // Simulate connection loss
      service.sseConnection.simulateError();

      expect(service.isConnected).toBe(false);
      expect(service.reconnectAttempts).toBe(0);

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(service.reconnectAttempts).toBe(1);
    });

    test("should use exponential backoff for reconnection", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      };
      service.config.reconnectDelay = 100;

      await service.connect(userId, preferences);

      const startTime = Date.now();

      // Simulate connection loss multiple times
      for (let i = 0; i < 3; i++) {
        service.sseConnection.simulateError();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const elapsedTime = Date.now() - startTime;

      // Should have used exponential backoff (100ms, 200ms, 400ms)
      expect(elapsedTime).toBeGreaterThan(600);
    });

    test("should stop reconnecting after max attempts", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      };
      service.config.maxReconnectAttempts = 2;

      await service.connect(userId, preferences);

      // Simulate multiple connection failures
      for (let i = 0; i < 5; i++) {
        service.sseConnection.simulateError();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      expect(service.reconnectAttempts).toBe(2);
      expect(service.isConnected).toBe(false);
    });
  });

  describe("Message Queuing", () => {
    test("should queue messages when offline", () => {
      service.isOnline = false;

      const message = { type: "test", data: "test data" };
      service.queueMessage(message);

      expect(service.messageQueue).toHaveLength(1);
      expect(service.messageQueue[0]).toMatchObject(message);
      expect(service.messageQueue[0].queuedAt).toBeDefined();
    });

    test("should limit queue size", () => {
      service.config.messageQueueSize = 2;

      for (let i = 0; i < 5; i++) {
        service.queueMessage({ type: "test", data: `test-${i}` });
      }

      expect(service.messageQueue).toHaveLength(2);
      expect(service.messageQueue[0].data).toBe("test-3");
      expect(service.messageQueue[1].data).toBe("test-4");
    });

    test("should process queued messages when connection restored", async () => {
      const handler = jest.fn();
      service.subscribe("test-event", handler);

      // Queue messages while offline
      service.isOnline = false;
      service.queueMessage({ type: "test-event", data: "message-1" });
      service.queueMessage({ type: "test-event", data: "message-2" });

      // Restore connection
      service.isOnline = true;
      service.processMessageQueue();

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith("message-1");
      expect(handler).toHaveBeenCalledWith("message-2");
      expect(service.messageQueue).toHaveLength(0);
    });
  });

  describe("Health Monitoring", () => {
    test("should start health monitoring on connection", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      expect(service.connectionHealthCheck).toBeDefined();
    });

    test("should stop health monitoring on disconnection", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });
      service.disconnect();

      expect(service.connectionHealthCheck).toBeNull();
    });

    test("should check connection health periodically", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.WEBSOCKET,
      });

      const healthCheckSpy = jest.spyOn(service, "checkConnectionHealth");

      // Fast forward time
      jest.advanceTimersByTime(service.config.healthCheckInterval);

      expect(healthCheckSpy).toHaveBeenCalled();
    });
  });

  describe("Browser Events", () => {
    test("should handle online status changes", () => {
      const connectSpy = jest.spyOn(service, "attemptReconnect");

      // Simulate going offline
      service.isOnline = false;
      service.handleOnlineStatus({ type: "offline" });

      expect(service.isOnline).toBe(false);

      // Simulate coming back online
      service.isOnline = true;
      service.handleOnlineStatus({ type: "online" });

      expect(service.isOnline).toBe(true);
      expect(connectSpy).toHaveBeenCalled();
    });

    test("should handle visibility changes", () => {
      const heartbeatSpy = jest.spyOn(service, "reduceHeartbeatFrequency");
      const restoreSpy = jest.spyOn(service, "restoreHeartbeatFrequency");

      // Simulate page hidden
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: true,
      });
      service.handleVisibilityChange();

      expect(heartbeatSpy).toHaveBeenCalled();

      // Simulate page visible
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: false,
      });
      service.handleVisibilityChange();

      expect(restoreSpy).toHaveBeenCalled();
    });
  });

  describe("Connection Statistics", () => {
    test("should return accurate connection stats", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      const stats = service.getConnectionStats();

      expect(stats).toMatchObject({
        isConnected: true,
        connectionType: REALTIME_CONNECTION_TYPES.SSE,
        reconnectAttempts: 0,
        userId: userId,
        isOnline: true,
        queuedMessages: 0,
      });
      expect(stats.connectionStartTime).toBeDefined();
    });

    test("should update stats on connection events", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      // Simulate receiving a message
      const startTime = Date.now();
      service.sseConnection.simulateMessage({
        type: "test-event",
        data: { test: "data" },
      });

      const stats = service.getConnectionStats();
      expect(stats.lastMessageTime).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe("Edge Cases", () => {
    test("should handle missing event data gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      // Send null event
      service.sseConnection.onmessage({ data: null });

      // Send undefined event
      service.sseConnection.onmessage({ data: undefined });

      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    test("should handle connection without user ID", async () => {
      await expect(service.connect(null)).rejects.toThrow();
    });

    test("should cleanup resources properly", () => {
      service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      });

      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
      const documentRemoveEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener"
      );

      service.cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "online",
        service.handleOnlineStatus
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "offline",
        service.handleOnlineStatus
      );
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        service.handleVisibilityChange
      );

      expect(service.isConnected).toBe(false);
      expect(service.eventHandlers.size).toBe(0);
      expect(service.messageQueue).toHaveLength(0);
    });
  });

  describe("WebSocket-specific functionality", () => {
    test("should send WebSocket ping messages", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.WEBSOCKET,
      });

      // Fast forward time to trigger heartbeat
      jest.advanceTimersByTime(service.config.heartbeatInterval);

      expect(service.websocketConnection.sentMessages).toContain(
        JSON.stringify({ type: "ping", timestamp: expect.any(Number) })
      );
    });

    test("should handle WebSocket close codes", async () => {
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.WEBSOCKET,
      });

      const reconnectSpy = jest.spyOn(service, "attemptReconnect");

      // Normal closure should not trigger reconnect
      service.websocketConnection.close(1000, "Normal closure");

      expect(reconnectSpy).not.toHaveBeenCalled();

      // Abnormal closure should trigger reconnect
      await service.connect(userId, {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.WEBSOCKET,
      });
      service.websocketConnection.close(1006, "Abnormal closure");

      expect(reconnectSpy).toHaveBeenCalled();
    });
  });

  describe("SSE-specific functionality", () => {
    test("should handle SSE connection errors", async () => {
      const preferences = {
        realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
      };

      await expect(service.connect(userId, preferences)).rejects.toThrow();
      expect(service.isConnected).toBe(false);
    });
  });
});
