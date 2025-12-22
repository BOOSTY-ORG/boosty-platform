/**
 * Notification Webhook Routes
 *
 * Handles webhook endpoints for external notification providers:
 * - Twilio SMS delivery status webhooks
 * - Mailgun email delivery status webhooks
 * - Webhook authentication and validation
 */

import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import {
  authenticateTwilioWebhook,
  authenticateMailgunWebhook,
} from '../middleware/notification/notificationAuth.middleware.js';

const router = Router();

/**
 * Twilio Webhook Routes
 */

// Twilio SMS status webhook
router.post(
  '/twilio',
  authenticateTwilioWebhook,
  notificationController.handleTwilioWebhook
);

/**
 * Mailgun Webhook Routes
 */

// Mailgun email events webhook
router.post(
  '/mailgun',
  authenticateMailgunWebhook,
  notificationController.handleMailgunWebhook
);

export default router;
