// Export utility functions for user data

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import csv from 'csv-writer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Ensure export directory exists
const ensureExportDir = async () => {
  const exportDir = path.join(process.cwd(), 'exports');
  try {
    await mkdir(exportDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
  return exportDir;
};

// Generate unique filename
const generateFilename = (format, prefix = 'users') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_export_${timestamp}.${format}`;
};

// Format user data for export
const formatUserData = (users, fields, includeRelated = {}) => {
  return users.map(user => {
    const formattedUser = {};
    
    // Include basic fields
    fields.forEach(field => {
      if (user[field] !== undefined) {
        formattedUser[field] = user[field];
      }
    });
    
    // Include related data if requested
    if (includeRelated.applications && user.applications) {
      formattedUser.applications = user.applications.map(app => ({
        id: app.id,
        status: app.status,
        createdAt: app.createdAt,
        solarCapacity: app.solarCapacity
      }));
    }
    
    if (includeRelated.installations && user.installations) {
      formattedUser.installations = user.installations.map(inst => ({
        id: inst.id,
        status: inst.status,
        installedAt: inst.installedAt,
        capacity: inst.capacity
      }));
    }
    
    if (includeRelated.communications && user.communications) {
      formattedUser.communications = user.communications.map(comm => ({
        id: comm.id,
        type: comm.type,
        subject: comm.subject,
        sentAt: comm.sentAt,
        status: comm.status
      }));
    }
    
    if (includeRelated.documents && user.documents) {
      formattedUser.documents = user.documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        expiresAt: doc.expiresAt
      }));
    }
    
    return formattedUser;
  });
};

// Export to CSV format
export const exportToCSV = async (data, filename, fields) => {
  const exportDir = await ensureExportDir();
  const filePath = path.join(exportDir, filename);
  
  const csvWriter = csv.createObjectCsvWriter({
    path: filePath,
    header: fields.map(field => ({ id: field, title: field }))
  });
  
  await csvWriter.writeRecords(data);
  
  return {
    path: filePath,
    size: fs.statSync(filePath).size,
    format: 'csv'
  };
};

// Export to Excel format
export const exportToExcel = async (data, filename, fields) => {
  const exportDir = await ensureExportDir();
  const filePath = path.join(exportDir, filename);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');
  
  // Add headers
  worksheet.addRow(fields);
  
  // Add data
  data.forEach(row => {
    const rowData = fields.map(field => {
      const value = row[field];
      if (value && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value;
    });
    worksheet.addRow(rowData);
  });
  
  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };
  
  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });
  
  await workbook.xlsx.writeFile(filePath);
  
  return {
    path: filePath,
    size: fs.statSync(filePath).size,
    format: 'excel'
  };
};

// Export to PDF format
export const exportToPDF = async (data, filename, fields) => {
  const exportDir = await ensureExportDir();
  const filePath = path.join(exportDir, filename);
  
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(filePath);
  
  doc.pipe(stream);
  
  // Add title
  doc.fontSize(20).text('User Export Report', { align: 'center' });
  doc.moveDown();
  
  // Add timestamp
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();
  
  // Add table headers
  const tableTop = 150;
  const itemHeight = 30;
  const startX = 50;
  let y = tableTop;
  
  // Draw headers
  doc.fontSize(10).font('Helvetica-Bold');
  fields.forEach((field, index) => {
    const x = startX + (index * 100);
    doc.text(field, x, y, { width: 90 });
  });
  
  // Draw data rows
  doc.fontSize(8).font('Helvetica');
  data.forEach((row, rowIndex) => {
    y = tableTop + itemHeight + (rowIndex * itemHeight);
    
    fields.forEach((field, colIndex) => {
      const x = startX + (colIndex * 100);
      const value = row[field];
      const displayValue = value && typeof value === 'object' 
        ? JSON.stringify(value).substring(0, 80) 
        : (value || '');
      doc.text(displayValue, x, y, { width: 90 });
    });
    
    // Add new page if needed
    if (y > 700) {
      doc.addPage();
      y = tableTop;
    }
  });
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve({
        path: filePath,
        size: fs.statSync(filePath).size,
        format: 'pdf'
      });
    });
    stream.on('error', reject);
  });
};

// Export to JSON format
export const exportToJSON = async (data, filename) => {
  const exportDir = await ensureExportDir();
  const filePath = path.join(exportDir, filename);
  
  const jsonData = JSON.stringify(data, null, 2);
  await writeFile(filePath, jsonData, 'utf8');
  
  return {
    path: filePath,
    size: fs.statSync(filePath).size,
    format: 'json'
  };
};

// Main export function
export const exportUserData = async (
  users,
  format,
  fields,
  includeRelated = {},
  customFilename = null
) => {
  try {
    // Format the data
    const formattedData = formatUserData(users, fields, includeRelated);
    
    // Generate filename
    const filename = customFilename || generateFilename(format);
    
    // Export based on format
    let result;
    switch (format.toLowerCase()) {
      case 'csv':
        result = await exportToCSV(formattedData, filename, fields);
        break;
      case 'excel':
      case 'xlsx':
        result = await exportToExcel(formattedData, filename, fields);
        break;
      case 'pdf':
        result = await exportToPDF(formattedData, filename, fields);
        break;
      case 'json':
        result = await exportToJSON(formattedData, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    return {
      success: true,
      ...result,
      filename,
      recordCount: users.length,
      fields,
      includeRelated
    };
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
};

// Get file info for download
export const getFileInfo = async (filename) => {
  const exportDir = path.join(process.cwd(), 'exports');
  const filePath = path.join(exportDir, filename);
  
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      path: filePath,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  } catch (error) {
    throw new Error(`File not found: ${filename}`);
  }
};

// Delete export file
export const deleteExportFile = async (filename) => {
  const exportDir = path.join(process.cwd(), 'exports');
  const filePath = path.join(exportDir, filename);
  
  try {
    await fs.promises.unlink(filePath);
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

// List all export files
export const listExportFiles = async () => {
  const exportDir = path.join(process.cwd(), 'exports');
  
  try {
    const files = await fs.promises.readdir(exportDir);
    const fileList = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(exportDir, file);
        const stats = await fs.promises.stat(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
    );
    
    return fileList.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    return [];
  }
};

// Clean up old export files (older than 7 days)
export const cleanupOldExports = async () => {
  const exportDir = path.join(process.cwd(), 'exports');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  try {
    const files = await fs.promises.readdir(exportDir);
    let deletedCount = 0;
    
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(exportDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.birthtime < sevenDaysAgo) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      })
    );
    
    return { deletedCount };
  } catch (error) {
    throw new Error(`Cleanup failed: ${error.message}`);
  }
};

export default {
  exportUserData,
  getFileInfo,
  deleteExportFile,
  listExportFiles,
  cleanupOldExports,
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportToJSON
};