import express from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import * as exportCtrl from '../controllers/export.controller.js';
import exportTemplateCtrl from '../controllers/exportTemplate.controller.js';
import scheduledExportCtrl from '../controllers/scheduledExport.controller.js';

const router = express.Router();

// Export routes
router.route('/api/exports')
  .post(authCtrl.requireSignin, exportCtrl.createExport);

router.route('/api/exports/analytics')
  .get(authCtrl.requireSignin, exportCtrl.getExportAnalytics);

router.route('/api/exports/history')
  .get(authCtrl.requireSignin, exportCtrl.getExportHistory);

router.route('/api/exports/:exportId')
  .get(authCtrl.requireSignin, exportCtrl.getExportStatus)
  .delete(authCtrl.requireSignin, exportCtrl.deleteExport);

router.route('/api/exports/:exportId/download')
  .get(authCtrl.requireSignin, exportCtrl.downloadExport);

router.route('/api/exports/:exportId/cancel')
  .post(authCtrl.requireSignin, exportCtrl.cancelExport);

// Export template routes
router.route('/api/export-templates')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getExportTemplates)
  .post(authCtrl.requireSignin, exportTemplateCtrl.createExportTemplate);

router.route('/api/export-templates/public')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getPublicTemplates);

router.route('/api/export-templates/default')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getDefaultTemplate);

router.route('/api/export-templates/stats')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getTemplateStats);

router.route('/api/export-templates/:templateId')
  .get(authCtrl.requireSignin, exportTemplateCtrl.getExportTemplate)
  .put(authCtrl.requireSignin, exportTemplateCtrl.updateExportTemplate)
  .delete(authCtrl.requireSignin, exportTemplateCtrl.deleteExportTemplate);

router.route('/api/export-templates/:templateId/duplicate')
  .post(authCtrl.requireSignin, exportTemplateCtrl.duplicateExportTemplate);

router.route('/api/export-templates/:templateId/set-default')
  .post(authCtrl.requireSignin, exportTemplateCtrl.setDefaultTemplate);

// Scheduled export routes
router.route('/api/scheduled-exports')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExports)
  .post(authCtrl.requireSignin, scheduledExportCtrl.createScheduledExport);

router.route('/api/scheduled-exports/stats')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExportStats);

router.route('/api/scheduled-exports/:scheduleId')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExport)
  .put(authCtrl.requireSignin, scheduledExportCtrl.updateScheduledExport)
  .delete(authCtrl.requireSignin, scheduledExportCtrl.deleteScheduledExport);

router.route('/api/scheduled-exports/:scheduleId/toggle')
  .post(authCtrl.requireSignin, scheduledExportCtrl.toggleScheduledExport);

router.route('/api/scheduled-exports/:scheduleId/run')
  .post(authCtrl.requireSignin, scheduledExportCtrl.runScheduledExport);

router.route('/api/scheduled-exports/:scheduleId/history')
  .get(authCtrl.requireSignin, scheduledExportCtrl.getScheduledExportHistory);

export default router;