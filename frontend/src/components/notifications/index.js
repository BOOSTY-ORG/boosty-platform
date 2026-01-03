// Notifications Components Export
// This file provides a convenient way to import all notification components from a single location

import MessageNotification from "./MessageNotification";
import MessageNotificationExample from "./MessageNotificationExample";
import TaskNotification from "./TaskNotification";
import TaskNotificationExample from "./TaskNotificationExample";
import ErrorNotification, {
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
} from "./ErrorNotification";
import ErrorNotificationExample from "./ErrorNotificationExample";
import SuccessNotification, {
  SUCCESS_TYPES,
  SUCCESS_LEVELS,
} from "./SuccessNotification";
import SuccessNotificationExample from "./SuccessNotificationExample";
import NotificationCenter, {
  VIEW_MODES,
  TAB_OPTIONS,
} from "./NotificationCenter";

export {
  MessageNotification,
  MessageNotificationExample,
  TaskNotification,
  TaskNotificationExample,
  ErrorNotification,
  ErrorNotificationExample,
  SuccessNotification,
  SuccessNotificationExample,
  NotificationCenter,
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
  SUCCESS_TYPES,
  SUCCESS_LEVELS,
  VIEW_MODES,
  TAB_OPTIONS,
};

// Default export with all components
export default {
  MessageNotification,
  MessageNotificationExample,
  TaskNotification,
  TaskNotificationExample,
  ErrorNotification,
  ErrorNotificationExample,
  SuccessNotification,
  SuccessNotificationExample,
  NotificationCenter,
};
