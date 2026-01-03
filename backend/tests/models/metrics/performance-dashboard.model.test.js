/**
 * Performance Dashboard Model Tests
 *
 * Tests for PerformanceDashboard model including:
 * - Model validation
 * - Static methods
 * - Instance methods
 * - Middleware functionality
 * - Virtual fields
 */

const mongoose = require('mongoose');
const PerformanceDashboard = require('../../../src/models/metrics/performance-dashboard.model.js');
const User = require('../../../src/models/user.model.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestDates,
  createMockRequest,
} = require('../../helpers/metrics.test.helpers.js');

describe('PerformanceDashboard Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await PerformanceDashboard.deleteMany({});
    await User.deleteMany({});
  });

  describe('Model Validation', () => {
    let userId;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId();
    });

    test('should create a valid performance dashboard', async () => {
      const dashboardData = {
        dashboardId: 'user123-overview-1640995200000',
        name: 'System Overview Dashboard',
        description: 'Main system performance overview',
        type: 'overview',
        category: 'operations',
        owner: userId,
        layout: 'grid',
        columns: 12,
        rows: 8,
        widgets: [
          {
            id: 'widget-1',
            type: 'metric',
            title: 'CPU Usage',
            position: { x: 0, y: 0, width: 4, height: 3 },
            config: { refreshInterval: 30 },
            dataSource: { metric: 'cpu' },
            permissions: {
              view: ['admin', 'manager'],
              edit: ['admin'],
              configure: ['admin'],
            },
          },
          {
            id: 'widget-2',
            type: 'chart',
            title: 'Memory Usage',
            position: { x: 4, y: 0, width: 4, height: 3 },
            config: { chartType: 'line' },
            dataSource: { metric: 'memory' },
            permissions: {
              view: ['admin', 'manager'],
              edit: ['admin'],
              configure: ['admin'],
            },
          },
        ],
        filters: {
          timeRange: '24h',
          environment: 'production',
          tags: ['system'],
        },
        isPublic: false,
        isTemplate: false,
        sharedWith: [],
        settings: {
          autoRefresh: true,
          refreshInterval: 30,
          theme: 'auto',
          density: 'normal',
          showGrid: true,
          snapToGrid: true,
        },
        tags: ['system', 'overview'],
        version: 1,
        isActive: true,
        isArchived: false,
      };

      const dashboard = new PerformanceDashboard(dashboardData);
      const savedDashboard = await dashboard.save();

      expect(savedDashboard.dashboardId).toBe(dashboardData.dashboardId);
      expect(savedDashboard.name).toBe(dashboardData.name);
      expect(savedDashboard.description).toBe(dashboardData.description);
      expect(savedDashboard.type).toBe(dashboardData.type);
      expect(savedDashboard.category).toBe(dashboardData.category);
      expect(savedDashboard.owner.toString()).toBe(userId.toString());
      expect(savedDashboard.layout).toBe(dashboardData.layout);
      expect(savedDashboard.columns).toBe(dashboardData.columns);
      expect(savedDashboard.rows).toBe(dashboardData.rows);
      expect(savedDashboard.widgets).toHaveLength(2);
      expect(savedDashboard.filters.timeRange).toBe(
        dashboardData.filters.timeRange
      );
      expect(savedDashboard.isPublic).toBe(dashboardData.isPublic);
      expect(savedDashboard.isTemplate).toBe(dashboardData.isTemplate);
      expect(savedDashboard.tags).toEqual(dashboardData.tags);
      expect(savedDashboard.version).toBe(dashboardData.version);
      expect(savedDashboard.isActive).toBe(dashboardData.isActive);
      expect(savedDashboard.isArchived).toBe(dashboardData.isArchived);
    });

    test('should require dashboardId, name, type, and owner', async () => {
      const dashboard = new PerformanceDashboard({});

      let error;
      try {
        await dashboard.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.dashboardId).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.type).toBeDefined();
      expect(error.errors.owner).toBeDefined();
    });

    test('should validate type enum values', async () => {
      const dashboardData = {
        dashboardId: 'test-invalid-type',
        name: 'Test Dashboard',
        type: 'invalid',
        owner: userId,
      };

      const dashboard = new PerformanceDashboard(dashboardData);

      let error;
      try {
        await dashboard.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.type).toBeDefined();
    });

    test('should validate layout enum values', async () => {
      const dashboardData = {
        dashboardId: 'test-invalid-layout',
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
        layout: 'invalid',
      };

      const dashboard = new PerformanceDashboard(dashboardData);

      let error;
      try {
        await dashboard.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.layout).toBeDefined();
    });

    test('should validate columns range', async () => {
      const dashboardData = {
        dashboardId: 'test-invalid-columns',
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
        columns: 15, // Invalid: > 12
      };

      const dashboard = new PerformanceDashboard(dashboardData);

      let error;
      try {
        await dashboard.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.columns).toBeDefined();
    });

    test('should validate widget type enum values', async () => {
      const dashboardData = {
        dashboardId: 'test-invalid-widget-type',
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
        widgets: [
          {
            id: 'widget-1',
            type: 'invalid',
            title: 'Test Widget',
            position: { x: 0, y: 0, width: 4, height: 3 },
          },
        ],
      };

      const dashboard = new PerformanceDashboard(dashboardData);

      let error;
      try {
        await dashboard.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['widgets.0.type']).toBeDefined();
    });

    test('should validate widget position ranges', async () => {
      const dashboardData = {
        dashboardId: 'test-invalid-position',
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
        columns: 6,
        rows: 6,
        widgets: [
          {
            id: 'widget-1',
            type: 'metric',
            title: 'Test Widget',
            position: { x: -1, y: 0, width: 4, height: 3 }, // Invalid x
          },
        ],
      };

      const dashboard = new PerformanceDashboard(dashboardData);

      let error;
      try {
        await dashboard.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['widgets.0.position.x']).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    let userId1, userId2;

    beforeEach(async () => {
      userId1 = new mongoose.Types.ObjectId();
      userId2 = new mongoose.Types.ObjectId();

      // Create test dashboards
      const dashboards = [
        {
          dashboardId: 'user1-dashboard-1',
          name: 'User 1 Dashboard 1',
          type: 'overview',
          owner: userId1,
          isPublic: false,
          isActive: true,
          isArchived: false,
          accessCount: 10,
          favoriteCount: 5,
        },
        {
          dashboardId: 'user1-dashboard-2',
          name: 'User 1 Dashboard 2',
          type: 'system',
          owner: userId1,
          isPublic: true,
          isActive: true,
          isArchived: false,
          accessCount: 20,
          favoriteCount: 8,
        },
        {
          dashboardId: 'user2-dashboard-1',
          name: 'User 2 Dashboard 1',
          type: 'api',
          owner: userId2,
          isPublic: true,
          isActive: true,
          isArchived: false,
          accessCount: 15,
          favoriteCount: 3,
        },
        {
          dashboardId: 'archived-dashboard',
          name: 'Archived Dashboard',
          type: 'database',
          owner: userId1,
          isPublic: false,
          isActive: false,
          isArchived: true,
          accessCount: 5,
          favoriteCount: 1,
        },
        {
          dashboardId: 'template-dashboard',
          name: 'Template Dashboard',
          type: 'custom',
          owner: userId2,
          isPublic: false,
          isTemplate: true,
          isActive: true,
          isArchived: false,
          accessCount: 30,
          favoriteCount: 12,
        },
        {
          dashboardId: 'shared-dashboard',
          name: 'Shared Dashboard',
          type: 'overview',
          owner: userId1,
          isPublic: false,
          isActive: true,
          isArchived: false,
          sharedWith: [
            { user: userId2, permission: 'view', sharedAt: new Date() },
          ],
          accessCount: 8,
          favoriteCount: 2,
        },
      ];

      await PerformanceDashboard.insertMany(dashboards);
    });

    test('findByOwner should return dashboards by owner', async () => {
      const dashboards = await PerformanceDashboard.findByOwner(userId1);

      expect(dashboards).toHaveLength(3); // Excluding archived
      expect(
        dashboards.every((d) => d.owner.toString() === userId1.toString())
      ).toBe(true);
    });

    test('findByOwner should include archived when requested', async () => {
      const dashboards = await PerformanceDashboard.findByOwner(userId1, true);

      expect(dashboards).toHaveLength(4); // Including archived
    });

    test('findPublic should return public dashboards', async () => {
      const dashboards = await PerformanceDashboard.findPublic();

      expect(dashboards).toHaveLength(2);
      expect(dashboards.every((d) => d.isPublic && !d.isArchived)).toBe(true);
    });

    test('findPublic should filter by type', async () => {
      const dashboards = await PerformanceDashboard.findPublic('system');

      expect(dashboards).toHaveLength(1);
      expect(dashboards[0].type).toBe('system');
    });

    test('findSharedForUser should return dashboards shared with user', async () => {
      const dashboards = await PerformanceDashboard.findSharedForUser(userId2);

      expect(dashboards).toHaveLength(1);
      expect(
        dashboards[0].sharedWith.some(
          (s) => s.user.toString() === userId2.toString()
        )
      ).toBe(true);
    });

    test('findTemplates should return template dashboards', async () => {
      const dashboards = await PerformanceDashboard.findTemplates();

      expect(dashboards).toHaveLength(1);
      expect(dashboards[0].isTemplate).toBe(true);
    });

    test('search should find dashboards by search term', async () => {
      const dashboards = await PerformanceDashboard.search('User 1');

      expect(dashboards).toHaveLength(2);
      expect(dashboards.every((d) => d.name.includes('User 1'))).toBe(true);
    });

    test('search should filter by user access', async () => {
      const dashboards = await PerformanceDashboard.search(
        'Dashboard',
        userId2
      );

      expect(dashboards.length).toBeGreaterThan(0);
      // Should include dashboards owned by userId2, public, or shared with userId2
    });

    test('getStatistics should return dashboard statistics', async () => {
      const stats = await PerformanceDashboard.getStatistics();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toHaveProperty('total');
      expect(stats[0]).toHaveProperty('public');
      expect(stats[0]).toHaveProperty('templates');
      expect(stats[0]).toHaveProperty('shared');
      expect(stats[0]).toHaveProperty('typeStats');
      expect(stats[0]).toHaveProperty('categoryStats');
      expect(stats[0]).toHaveProperty('totalWidgets');
      expect(stats[0]).toHaveProperty('totalAccesses');
      expect(stats[0]).toHaveProperty('totalFavorites');
    });

    test('getStatistics should filter by owner', async () => {
      const stats = await PerformanceDashboard.getStatistics(userId1);

      expect(stats).toHaveLength(1);
      // Should only include dashboards owned by userId1
    });

    test('findMostPopular should return most popular dashboards', async () => {
      const dashboards = await PerformanceDashboard.findMostPopular(3);

      expect(dashboards).toHaveLength(3);
      // Should be sorted by favoriteCount and accessCount
      expect(dashboards[0].favoriteCount).toBeGreaterThanOrEqual(
        dashboards[1].favoriteCount
      );
    });

    test('createFromTemplate should create dashboard from template', async () => {
      const template = await PerformanceDashboard.findOne({ isTemplate: true });
      const newOwnerId = new mongoose.Types.ObjectId();

      const dashboard = await PerformanceDashboard.createFromTemplate(
        template._id,
        newOwnerId,
        { name: 'Custom Dashboard Name' }
      );

      expect(dashboard.name).toBe('Custom Dashboard Name');
      expect(dashboard.owner.toString()).toBe(newOwnerId.toString());
      expect(dashboard.parentDashboard.toString()).toBe(
        template._id.toString()
      );
      expect(dashboard.isTemplate).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    let testDashboard, userId;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId();
      testDashboard = await PerformanceDashboard.create({
        dashboardId: 'test-dashboard-methods',
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
        widgets: [
          {
            id: 'widget-1',
            type: 'metric',
            title: 'Widget 1',
            position: { x: 0, y: 0, width: 4, height: 3 },
          },
        ],
      });
    });

    test('addWidget should add widget to dashboard', async () => {
      const widgetData = {
        id: 'widget-2',
        type: 'chart',
        title: 'Widget 2',
        position: { x: 4, y: 0, width: 4, height: 3 },
      };

      await testDashboard.addWidget(widgetData);

      expect(testDashboard.widgets).toHaveLength(2);
      expect(testDashboard.widgets[1].id).toBe('widget-2');
    });

    test('addWidget should throw error for duplicate widget ID', async () => {
      const widgetData = {
        id: 'widget-1', // Duplicate
        type: 'chart',
        title: 'Widget 2',
        position: { x: 4, y: 0, width: 4, height: 3 },
      };

      await expect(testDashboard.addWidget(widgetData)).rejects.toThrow(
        'Widget with ID widget-1 already exists'
      );
    });

    test('updateWidget should update existing widget', async () => {
      const updateData = {
        title: 'Updated Widget 1',
        position: { x: 1, y: 1, width: 5, height: 4 },
      };

      await testDashboard.updateWidget('widget-1', updateData);

      expect(testDashboard.widgets[0].title).toBe('Updated Widget 1');
      expect(testDashboard.widgets[0].position.x).toBe(1);
      expect(testDashboard.widgets[0].position.y).toBe(1);
    });

    test('updateWidget should throw error for non-existent widget', async () => {
      const updateData = { title: 'Updated Widget' };

      await expect(
        testDashboard.updateWidget('non-existent', updateData)
      ).rejects.toThrow('Widget with ID non-existent not found');
    });

    test('removeWidget should remove widget from dashboard', async () => {
      await testDashboard.removeWidget('widget-1');

      expect(testDashboard.widgets).toHaveLength(0);
    });

    test('shareWithUser should share dashboard with user', async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      await testDashboard.shareWithUser(otherUserId, 'edit');

      expect(testDashboard.sharedWith).toHaveLength(1);
      expect(testDashboard.sharedWith[0].user.toString()).toBe(
        otherUserId.toString()
      );
      expect(testDashboard.sharedWith[0].permission).toBe('edit');
    });

    test('shareWithUser should update existing share', async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      // Initial share
      await testDashboard.shareWithUser(otherUserId, 'view');
      expect(testDashboard.sharedWith[0].permission).toBe('view');

      // Update share
      await testDashboard.shareWithUser(otherUserId, 'admin');
      expect(testDashboard.sharedWith[0].permission).toBe('admin');
    });

    test('unshareWithUser should unshare dashboard with user', async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      await testDashboard.shareWithUser(otherUserId, 'view');
      expect(testDashboard.sharedWith).toHaveLength(1);

      await testDashboard.unshareWithUser(otherUserId);
      expect(testDashboard.sharedWith).toHaveLength(0);
    });

    test('incrementAccess should increment access count and update lastAccessed', async () => {
      const originalAccessCount = testDashboard.accessCount;
      const originalLastAccessed = testDashboard.lastAccessed;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await testDashboard.incrementAccess();

      expect(testDashboard.accessCount).toBe(originalAccessCount + 1);
      expect(testDashboard.lastAccessed.getTime()).toBeGreaterThan(
        originalLastAccessed.getTime()
      );
    });

    test('toggleFavorite should increment favorite count', async () => {
      const originalFavoriteCount = testDashboard.favoriteCount;

      await testDashboard.toggleFavorite(userId, true);

      expect(testDashboard.favoriteCount).toBe(originalFavoriteCount + 1);
    });

    test('toggleFavorite should decrement favorite count', async () => {
      testDashboard.favoriteCount = 5;
      const originalFavoriteCount = testDashboard.favoriteCount;

      await testDashboard.toggleFavorite(userId, false);

      expect(testDashboard.favoriteCount).toBe(originalFavoriteCount - 1);
    });

    test('toggleFavorite should not go below 0', async () => {
      testDashboard.favoriteCount = 0;

      await testDashboard.toggleFavorite(userId, false);

      expect(testDashboard.favoriteCount).toBe(0);
    });

    test('archive should archive dashboard', async () => {
      await testDashboard.archive();

      expect(testDashboard.isArchived).toBe(true);
      expect(testDashboard.isActive).toBe(false);
    });

    test('restore should restore dashboard', async () => {
      await testDashboard.archive();
      await testDashboard.restore();

      expect(testDashboard.isArchived).toBe(false);
      expect(testDashboard.isActive).toBe(true);
    });

    test('validate should validate dashboard configuration', async () => {
      // Add duplicate widget ID
      testDashboard.widgets.push({
        id: 'widget-1', // Duplicate
        type: 'chart',
        title: 'Widget 2',
        position: { x: 4, y: 0, width: 4, height: 3 },
      });

      const validation = testDashboard.validate();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Duplicate widget IDs: widget-1');
    });

    test('validate should detect overlapping positions', async () => {
      // Add overlapping widget
      testDashboard.widgets.push({
        id: 'widget-2',
        type: 'chart',
        title: 'Widget 2',
        position: { x: 0, y: 0, width: 4, height: 3 }, // Same position
      });

      const validation = testDashboard.validate();

      expect(validation.warnings).toContain(
        'Overlapping widget positions: 0-0'
      );
    });

    test('validate should detect out-of-bounds widgets', async () => {
      testDashboard.columns = 6;
      testDashboard.rows = 6;
      testDashboard.widgets[0].position = { x: 4, y: 0, width: 4, height: 3 }; // Exceeds columns

      const validation = testDashboard.validate();

      expect(validation.warnings).toContain(
        'Widget widget-1 exceeds column boundary'
      );
    });

    test('clone should create a clone of the dashboard', async () => {
      const newOwnerId = new mongoose.Types.ObjectId();
      const clone = await testDashboard.clone(newOwnerId, {
        name: 'Cloned Dashboard',
      });

      expect(clone.name).toBe('Cloned Dashboard');
      expect(clone.owner.toString()).toBe(newOwnerId.toString());
      expect(clone.parentDashboard.toString()).toBe(
        testDashboard._id.toString()
      );
      expect(clone.widgets).toHaveLength(testDashboard.widgets.length);
      expect(clone.widgets[0].id).toContain('clone-');
    });
  });

  describe('Virtual Fields', () => {
    let testDashboard;

    beforeEach(async () => {
      testDashboard = new PerformanceDashboard({
        dashboardId: 'test-virtual-fields',
        name: 'Test Dashboard',
        type: 'overview',
        owner: new mongoose.Types.ObjectId(),
        widgets: [
          { id: 'widget-1', type: 'metric', title: 'Widget 1' },
          { id: 'widget-2', type: 'chart', title: 'Widget 2' },
        ],
        sharedWith: [
          { user: new mongoose.Types.ObjectId(), permission: 'view' },
        ],
      });
    });

    test('widgetCount virtual should return widget count', () => {
      expect(testDashboard.widgetCount).toBe(2);
    });

    test('sharedUserCount virtual should return shared user count', () => {
      expect(testDashboard.sharedUserCount).toBe(1);
    });

    test('isShared virtual should return true when shared', () => {
      expect(testDashboard.isShared).toBe(true);
    });

    test('isShared virtual should return true when public', () => {
      testDashboard.sharedWith = [];
      testDashboard.isPublic = true;
      expect(testDashboard.isShared).toBe(true);
    });

    test('isShared virtual should return false when not shared', () => {
      testDashboard.sharedWith = [];
      testDashboard.isPublic = false;
      expect(testDashboard.isShared).toBe(false);
    });
  });

  describe('Middleware', () => {
    let userId;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId();
    });

    test('pre-save middleware should set dashboardId if not provided', async () => {
      const dashboard = new PerformanceDashboard({
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
      });

      await dashboard.save();
      expect(dashboard.dashboardId).toBeDefined();
      expect(dashboard.dashboardId).toMatch(
        new RegExp(`^${userId}-overview-\\d+$`)
      );
    });

    test('pre-save middleware should validate dashboard before saving', async () => {
      const dashboard = new PerformanceDashboard({
        name: 'Test Dashboard',
        type: 'overview',
        owner: userId,
        widgets: [
          { id: 'widget-1', type: 'metric', title: 'Widget 1' },
          { id: 'widget-1', type: 'chart', title: 'Widget 2' }, // Duplicate ID
        ],
      });

      await expect(dashboard.save()).rejects.toThrow(
        'Dashboard validation failed: Duplicate widget IDs: widget-1'
      );
    });
  });
});
