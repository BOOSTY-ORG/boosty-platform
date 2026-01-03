import ScheduledExport from '../models/scheduledExport.model.js';
import ExportHistory from '../models/exportHistory.model.js';
import { processExport } from '../controllers/export.controller.js';
import mongoose from 'mongoose';

class ExportScheduler {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = 60000; // Check every minute
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('Export scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting export scheduler...');

    // Run immediately on start
    this.checkDueExports();

    // Set up interval to check for due exports
    this.interval = setInterval(() => {
      this.checkDueExports();
    }, this.checkInterval);

    console.log('Export scheduler started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      console.log('Export scheduler is not running');
      return;
    }

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('Export scheduler stopped');
  }

  // Check for due exports and process them
  async checkDueExports() {
    try {
      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('[DEBUG] Database not connected, skipping export check');
        return;
      }
      
      const dueExports = await ScheduledExport.getDueSchedules();
      
      if (dueExports.length === 0) {
        return;
      }

      console.log(`Found ${dueExports.length} due scheduled exports`);

      // Process each due export
      for (const scheduledExport of dueExports) {
        try {
          await this.processScheduledExport(scheduledExport);
        } catch (error) {
          console.error(`Failed to process scheduled export ${scheduledExport._id}:`, error);
          
          // Record failure
          try {
            await scheduledExport.recordRun('failure', null, error);
          } catch (recordError) {
            console.error('Failed to record export failure:', recordError);
          }
        }
      }

    } catch (error) {
      console.error('Error checking due exports:', error);
      
      // Handle database connection errors gracefully
      if (error.name === 'MongoServerSelectionError' || error.name === 'MongoNetworkError') {
        console.log('[DEBUG] Database connection issue detected, will retry on next check');
      } else {
        console.error('Unexpected error in export scheduler:', error);
      }
    }
  }

  // Process a single scheduled export
  async processScheduledExport(scheduledExport) {
    console.log(`Processing scheduled export: ${scheduledExport.name}`);

    try {
      // Create export history record
      const exportHistory = new ExportHistory({
        exportId: `scheduled_${scheduledExport._id}_${Date.now()}`,
        filename: `${scheduledExport.name}_${new Date().toISOString().replace(/[:.]/g, '-')}.${scheduledExport.format}`,
        format: scheduledExport.format,
        fields: scheduledExport.fields.map(f => f.name),
        includeRelated: scheduledExport.includeRelated,
        filters: scheduledExport.filters,
        template: scheduledExport.template,
        scheduledExport: scheduledExport._id,
        createdBy: scheduledExport.createdBy
      });

      await exportHistory.save();

      // Start export process asynchronously
      processExport(exportHistory._id, scheduledExport.createdBy)
        .then(async () => {
          // Record success
          await scheduledExport.recordRun('success', exportHistory._id);
          
          // Send notifications if configured
          await this.sendNotifications(scheduledExport, exportHistory, 'success');
        })
        .catch(async (error) => {
          console.error(`Scheduled export processing failed:`, error);
          
          // Record failure
          await scheduledExport.recordRun('failure', exportHistory._id, error);
          
          // Send notifications if configured
          await this.sendNotifications(scheduledExport, exportHistory, 'failure', error);
        });

      console.log(`Scheduled export ${scheduledExport.name} started successfully`);

    } catch (error) {
      console.error(`Error processing scheduled export ${scheduledExport.name}:`, error);
      throw error;
    }
  }

  // Send notifications for scheduled export completion
  async sendNotifications(scheduledExport, exportHistory, status, error = null) {
    try {
      const notifications = scheduledExport.notifications;
      
      if (!notifications) {
        return;
      }

      // Send in-app notification
      if (notifications.inApp && notifications.inApp.enabled) {
        // TODO: Implement in-app notification system
        console.log(`In-app notification sent for scheduled export ${scheduledExport.name}`);
      }

      // Send email notification
      if (notifications.email && notifications.email.enabled) {
        await this.sendEmailNotification(scheduledExport, exportHistory, status, error);
      }

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  // Send email notification
  async sendEmailNotification(scheduledExport, exportHistory, status, error = null) {
    try {
      // TODO: Implement email notification using nodemailer
      const emailConfig = scheduledExport.notifications.email;
      
      const subject = status === 'success' 
        ? emailConfig.subject || 'Scheduled Export Completed'
        : `Scheduled Export Failed: ${scheduledExport.name}`;
      
      const body = status === 'success'
        ? `${emailConfig.body || 'Your scheduled export is ready for download.'}\n\nExport Details:\nName: ${scheduledExport.name}\nFormat: ${scheduledExport.format}\nRecords: ${exportHistory.totalRecords}\nFile Size: ${this.formatFileSize(exportHistory.fileSize)}`
        : `Your scheduled export "${scheduledExport.name}" has failed.\n\nError: ${error?.message || 'Unknown error'}`;

      console.log(`Email notification sent for scheduled export ${scheduledExport.name}:`, { subject, body });

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (!bytes) return '0 bytes';
    
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cleanup old export history and files
  async cleanup() {
    try {
      console.log('Starting export cleanup...');

      // Clean up expired export history records
      const deletedHistoryCount = await ExportHistory.cleanupExpired();
      console.log(`Deleted ${deletedHistoryCount} expired export history records`);

      // Clean up old export history references from scheduled exports
      const deletedRefsCount = await ScheduledExport.cleanupHistory();
      console.log(`Removed ${deletedRefsCount} old export history references`);

      console.log('Export cleanup completed');

    } catch (error) {
      console.error('Error during export cleanup:', error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval) : null
    };
  }
}

// Create singleton instance
const exportScheduler = new ExportScheduler();

export default exportScheduler;