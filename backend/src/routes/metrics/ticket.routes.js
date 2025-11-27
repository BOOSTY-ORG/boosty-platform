import express from "express";
import { investorMetricsAccess, requireOwnershipOrAdmin } from "../../middleware/metrics/auth.middleware.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { uploadSingle } from "../../middleware/metrics/fileUpload.middleware.js";
import * as ticketController from "../../controllers/metrics/ticket.controller.js";

const router = express.Router();

// Apply ticket-specific middleware
router.use(investorMetricsAccess);

// Ticket CRUD operations
router.post('/', ticketController.createTicket);
router.put('/:ticketId', ticketController.updateTicket);
router.delete('/:ticketId', ticketController.deleteTicket);

// Ticket metrics endpoints
router.get('/metrics', ticketController.getTicketMetrics);
router.get('/', buildQuery, ticketController.getTicketList);
router.get('/search', buildQuery, ticketController.searchTickets);

// Individual ticket endpoints
router.get('/:ticketId', ticketController.getTicketDetails);
router.get('/:ticketId/activity', ticketController.getTicketActivity);

// Ticket assignment and status operations
router.put('/:ticketId/assign', ticketController.assignTicket);
router.put('/:ticketId/status', ticketController.updateTicketStatus);

// Ticket notes and attachments
router.post('/:ticketId/notes', ticketController.addTicketNote);
router.post('/:ticketId/attachments', uploadSingle, ticketController.uploadTicketAttachment);

// Bulk operations
router.post('/bulk-update', ticketController.bulkUpdateTickets);
router.post('/bulk-assign', ticketController.bulkAssignTickets);
router.post('/bulk-update-status', ticketController.bulkUpdateStatus);
router.post('/bulk-delete', ticketController.bulkDeleteTickets);

// Apply ownership check for individual ticket data
router.use('/:ticketId', requireOwnershipOrAdmin('ticketId'));

export default router;