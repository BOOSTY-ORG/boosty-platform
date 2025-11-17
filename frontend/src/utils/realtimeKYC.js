// Real-time KYC status updates utility

class RealtimeKYC {
  constructor() {
    this.listeners = new Map();
    this.pollingIntervals = new Map();
    this.websocket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  // Initialize WebSocket connection for real-time updates
  initWebSocket(investorId) {
    if (this.websocket) {
      this.websocket.close();
    }

    try {
      // Use WebSocket URL from environment or default
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:7000';
      this.websocket = new WebSocket(`${wsUrl}/kyc/${investorId}`);

      this.websocket.onopen = () => {
        console.log('WebSocket connected for KYC updates');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.attemptReconnect(investorId);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      // Fallback to polling
      this.startPolling(investorId);
    }
  }

  // Attempt to reconnect WebSocket
  attemptReconnect(investorId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.startPolling(investorId);
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.initWebSocket(investorId);
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  // Start polling as fallback
  startPolling(investorId, interval = 5000) {
    // Clear existing polling for this investor
    if (this.pollingIntervals.has(investorId)) {
      clearInterval(this.pollingIntervals.get(investorId));
    }

    const pollInterval = setInterval(async () => {
      try {
        // Import API dynamically to avoid circular dependencies
        const { investorsAPI } = await import('../api/investors.js');
        const response = await investorsAPI.getInvestorKYC(investorId);
        
        this.handleMessage({
          type: 'kyc_update',
          data: response.data
        });
      } catch (error) {
        console.error('Error polling KYC status:', error);
      }
    }, interval);

    this.pollingIntervals.set(investorId, pollInterval);
  }

  // Stop polling for specific investor
  stopPolling(investorId) {
    if (this.pollingIntervals.has(investorId)) {
      clearInterval(this.pollingIntervals.get(investorId));
      this.pollingIntervals.delete(investorId);
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type, data } = message;

    switch (type) {
      case 'kyc_update':
        this.notifyListeners('kyc_update', data);
        break;
      case 'document_uploaded':
        this.notifyListeners('document_uploaded', data);
        break;
      case 'document_verified':
        this.notifyListeners('document_verified', data);
        break;
      case 'document_rejected':
        this.notifyListeners('document_rejected', data);
        break;
      case 'document_flagged':
        this.notifyListeners('document_flagged', data);
        break;
      case 'expiry_alert':
        this.notifyListeners('expiry_alert', data);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  // Add event listener
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  // Remove event listener
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  // Notify all listeners for an event
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Subscribe to KYC updates for an investor
  subscribe(investorId, callback) {
    this.addListener('kyc_update', callback);
    
    if (!this.isConnected && !this.pollingIntervals.has(investorId)) {
      // Try WebSocket first, fallback to polling
      this.initWebSocket(investorId);
    }
  }

  // Subscribe to document upload events
  onDocumentUploaded(callback) {
    this.addListener('document_uploaded', callback);
  }

  // Subscribe to document verification events
  onDocumentVerified(callback) {
    this.addListener('document_verified', callback);
  }

  // Subscribe to document rejection events
  onDocumentRejected(callback) {
    this.addListener('document_rejected', callback);
  }

  // Subscribe to document flag events
  onDocumentFlagged(callback) {
    this.addListener('document_flagged', callback);
  }

  // Subscribe to expiry alerts
  onExpiryAlert(callback) {
    this.addListener('expiry_alert', callback);
  }

  // Unsubscribe from all events for an investor
  unsubscribe(investorId) {
    this.stopPolling(investorId);
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.isConnected = false;
  }

  // Cleanup all subscriptions and connections
  cleanup() {
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Clear all listeners
    this.listeners.clear();
    this.isConnected = false;
  }
}

// Create singleton instance
const realtimeKYC = new RealtimeKYC();

// React hook for using real-time KYC updates
export const useRealtimeKYC = (investorId) => {
  const [kycDocuments, setKycDocuments] = React.useState([]);
  const [lastUpdate, setLastUpdate] = React.useState(null);

  React.useEffect(() => {
    if (!investorId) return;

    const handleKYCUpdate = (data) => {
      setKycDocuments(data.documents || data);
      setLastUpdate(new Date());
    };

    // Subscribe to updates
    realtimeKYC.subscribe(investorId, handleKYCUpdate);

    // Cleanup on unmount
    return () => {
      realtimeKYC.unsubscribe(investorId);
    };
  }, [investorId]);

  return {
    kycDocuments,
    lastUpdate,
    isConnected: realtimeKYC.isConnected
  };
};

// React hook for document-specific events
export const useDocumentEvents = (investorId) => {
  const [events, setEvents] = React.useState([]);

  const addEvent = React.useCallback((event) => {
    setEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
  }, []);

  React.useEffect(() => {
    if (!investorId) return;

    // Subscribe to various document events
    realtimeKYC.onDocumentUploaded(addEvent);
    realtimeKYC.onDocumentVerified(addEvent);
    realtimeKYC.onDocumentRejected(addEvent);
    realtimeKYC.onDocumentFlagged(addEvent);

    return () => {
      realtimeKYC.removeListener('document_uploaded', addEvent);
      realtimeKYC.removeListener('document_verified', addEvent);
      realtimeKYC.removeListener('document_rejected', addEvent);
      realtimeKYC.removeListener('document_flagged', addEvent);
    };
  }, [investorId, addEvent]);

  return { events };
};

// React hook for expiry alerts
export const useExpiryAlerts = (investorId) => {
  const [alerts, setAlerts] = React.useState([]);

  const addAlert = React.useCallback((alert) => {
    setAlerts(prev => [alert, ...prev.filter(a => a.documentId !== alert.documentId)]);
  }, []);

  React.useEffect(() => {
    if (!investorId) return;

    realtimeKYC.onExpiryAlert(addAlert);

    return () => {
      realtimeKYC.removeListener('expiry_alert', addAlert);
    };
  }, [investorId, addAlert]);

  return { alerts };
};

export default realtimeKYC;