import express from "express";
import { investorMetricsAccess, requireOwnershipOrAdmin } from "../../middleware/metrics/auth.middleware.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { uploadSingle } from "../../middleware/metrics/fileUpload.middleware.js";
import * as investorController from "../../controllers/metrics/investor.controller.js";

const router = express.Router();

// Apply investor-specific middleware
router.use(investorMetricsAccess);

// Investor CRUD operations
router.post('/', investorController.createInvestor);
router.put('/:investorId', investorController.updateInvestor);
router.delete('/:investorId', investorController.deleteInvestor);

// Investor metrics endpoints
router.get('/metrics', investorController.getInvestorMetrics);
router.get('/', buildQuery, investorController.getInvestorList);
router.get('/performance', investorController.getInvestorPerformanceMetrics);
router.get('/search', buildQuery, investorController.searchInvestors);

// Individual investor endpoints
router.get('/:investorId', investorController.getInvestorDetails);
router.get('/:investorId/performance-analytics', investorController.getInvestorPerformanceAnalytics);
router.get('/:investorId/portfolio-analysis', investorController.getPortfolioAnalysis);
router.get('/:investorId/risk-assessment', investorController.getRiskAssessment);
router.get('/:investorId/investment-timeline', investorController.getInvestmentTimeline);
router.get('/:investorId/financial-summary', investorController.getFinancialSummary);

// Investor KYC operations
router.post('/:investorId/kyc', uploadSingle, investorController.uploadKYCDocument);
router.get('/:investorId/kyc', investorController.getInvestorKYCDocuments);
router.put('/:investorId/kyc/:documentId/verify', investorController.verifyKYCDocument);
router.put('/:investorId/kyc/:documentId/reject', investorController.rejectKYCDocument);
router.put('/:investorId/kyc/:documentId/flag', investorController.flagKYCDocument);
router.get('/:investorId/kyc/:documentId/history', investorController.getDocumentHistory);
router.post('/:investorId/kyc/compare', investorController.compareDocuments);
router.post('/:investorId/kyc/bulk-verify', investorController.bulkVerifyDocuments);
router.post('/:investorId/kyc/bulk-reject', investorController.bulkRejectDocuments);

// Bulk operations
router.post('/bulk-update', investorController.bulkUpdateInvestors);
router.post('/bulk-kyc-verify', investorController.bulkVerifyKYC);
router.post('/bulk-kyc-reject', investorController.bulkRejectKYC);
// Export functionality
router.post('/export', investorController.exportInvestorsAdvanced);
router.get('/export/templates', investorController.getExportTemplates);
router.post('/export/templates', investorController.createExportTemplate);
router.put('/export/templates/:templateId', investorController.updateExportTemplate);
router.delete('/export/templates/:templateId', investorController.deleteExportTemplate);
router.get('/export/history', investorController.getExportHistory);
router.get('/export/:exportId/status', investorController.getExportStatus);
router.get('/export/:exportId/download', investorController.downloadExportFile);
router.post('/export/:exportId/cancel', investorController.cancelExport);
router.post('/export/schedule', investorController.scheduleExport);
router.get('/export/scheduled', investorController.getScheduledExports);
router.put('/export/scheduled/:scheduleId', investorController.updateScheduledExport);
router.delete('/export/scheduled/:scheduleId', investorController.deleteScheduledExport);
router.get('/export/queue-status', investorController.getExportQueueStatus);
router.get('/export/analytics', investorController.getExportAnalytics);

router.post('/bulk-export', investorController.bulkExportInvestors);
router.post('/bulk-delete', investorController.bulkDeleteInvestors);
router.post('/bulk-communication', investorController.bulkSendCommunication);

// Apply ownership check for individual investor data
router.use('/:investorId', requireOwnershipOrAdmin('investorId'));

export default router;