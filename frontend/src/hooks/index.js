// Hooks Export
// This file provides a convenient way to import all hooks from a single location

import useNotification from "./useNotification";
import useDebounce from "./useDebounce";
import useRealtimeNotifications from "./useRealtimeNotifications";

export { useNotification, useDebounce, useRealtimeNotifications };

// Default export with all hooks
export default {
  useNotification,
  useDebounce,
  useRealtimeNotifications,
};
