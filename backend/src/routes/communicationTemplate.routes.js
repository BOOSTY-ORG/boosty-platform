import express from 'express';
import {
  getCommunicationTemplates,
  getCommunicationTemplateById,
  createCommunicationTemplate,
  updateCommunicationTemplate,
  deleteCommunicationTemplate,
  duplicateCommunicationTemplate,
  getCommunicationTemplateUsage,
  getPopularTemplates,
  getSystemTemplates,
  getTemplatesByCategory,
  bulkUpdateTemplates,
  testTemplate
} from '../controllers/communicationTemplate.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateCommunicationTemplate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/communication-templates
 * @desc    Get all communication templates
 * @access   Private
 */
router.get('/', getCommunicationTemplates);

/**
 * @route   GET /api/communication-templates/popular
 * @desc    Get popular communication templates
 * @access   Private
 */
router.get('/popular', getPopularTemplates);

/**
 * @route   GET /api/communication-templates/system
 * @desc    Get system communication templates
 * @access   Private
 */
router.get('/system', getSystemTemplates);

/**
 * @route   GET /api/communication-templates/category/:category
 * @desc    Get templates by category
 * @access   Private
 */
router.get('/category/:category', getTemplatesByCategory);

/**
 * @route   GET /api/communication-templates/:id
 * @desc    Get communication template by ID
 * @access   Private
 */
router.get('/:id', getCommunicationTemplateById);

/**
 * @route   POST /api/communication-templates
 * @desc    Create new communication template
 * @access   Private
 */
router.post('/', validateCommunicationTemplate, createCommunicationTemplate);

/**
 * @route   PUT /api/communication-templates/:id
 * @desc    Update communication template
 * @access   Private
 */
router.put('/:id', validateCommunicationTemplate, updateCommunicationTemplate);

/**
 * @route   DELETE /api/communication-templates/:id
 * @desc    Delete communication template
 * @access   Private
 */
router.delete('/:id', deleteCommunicationTemplate);

/**
 * @route   POST /api/communication-templates/:id/duplicate
 * @desc    Duplicate communication template
 * @access   Private
 */
router.post('/:id/duplicate', duplicateCommunicationTemplate);

/**
 * @route   GET /api/communication-templates/:id/usage
 * @desc    Get template usage statistics
 * @access   Private
 */
router.get('/:id/usage', getCommunicationTemplateUsage);

/**
 * @route   POST /api/communication-templates/bulk-update
 * @desc    Bulk update templates
 * @access   Private
 */
router.post('/bulk-update', bulkUpdateTemplates);

/**
 * @route   POST /api/communication-templates/:id/test
 * @desc    Test template rendering
 * @access   Private
 */
router.post('/:id/test', testTemplate);

export default router;