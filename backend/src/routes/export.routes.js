import express from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import * as exportCtrl from '../controllers/export.controller.js';
import exportTemplateCtrl from '../controllers/exportTemplate.controller.js';
import scheduledExportCtrl from '../controllers/scheduledExport.controller.js';

const router = express.Router();

// Export routes
router.route('/exports').post(authCtrl.requireSignin, exportCtrl.createExport);

router
  .route('/exports/analytics')
  .get(authCtrl.requireSignin, exportCtrl.getExportAnalytics);

router
  .route('/exports/history')
  .get(authCtrl.requireSignin, exportCtrl.getExportHistory);

router
  .route('/exports/:exportId')
  .get(authCtrl.requireSignin, exportCtrl.getExportStatus)
  .delete(authCtrl.requireSignin, exportCtrl.deleteExport);

router
  .route('/exports/:exportId/download')
  .get(authCtrl.requireSignin, exportCtrl.downloadExport);

router
  .route('/exports/:exportId/cancel')
  .post(authCtrl.requireSignin, exportCtrl.cancelExport);

// Export template routes
router
  .route('/export-templates')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getExportTemplates)
  .post(authCtrl.requireSignin, exportTemplateCtrl.createExportTemplate);

router
  .route('/export-templates/public')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getPublicTemplates);

router
  .route('/export-templates/default')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getDefaultTemplate);

router
  .route('/export-templates/stats')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getTemplateStats);

router
  .route('/export-templates/:templateId')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getExportTemplate)
  .put(authCtrl.requireSignin, exportTemplateCtrl.updateExportTemplate)
  .delete(authCtrl.requireSignin, exportTemplateCtrl.deleteExportTemplate);

router
  .route('/export-templates/:templateId/duplicate')
  .post(authCtrl.requireSignin, exportTemplateCtrl.duplicateExportTemplate);

router
  .route('/export-templates/:templateId/set-default')
  .post(authCtrl.requireSignin, exportTemplateCtrl.setDefaultTemplate);

// Scheduled export routes
router
  .route('/scheduled-exports')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExports)
  .post(authCtrl.requireSignin, scheduledExportCtrl.createScheduledExport);

router
  .route('/scheduled-exports/stats')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExportStats);

router
  .route('/scheduled-exports/:scheduleId')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExport)
  .put(authCtrl.requireSignin, scheduledExportCtrl.updateScheduledExport)
  .delete(authCtrl.requireSignin, scheduledExportCtrl.deleteScheduledExport);

router
  .route('/scheduled-exports/:scheduleId/toggle')
  .post(authCtrl.requireSignin, scheduledExportCtrl.toggleScheduledExport);

router
  .route('/scheduled-exports/:scheduleId/run')
  .post(authCtrl.requireSignin, scheduledExportCtrl.runScheduledExport);

router
  .route('/scheduled-exports/:scheduleId/history')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExportHistory);

export default router;
