# KYC Document Management Components

This directory contains enhanced KYC (Know Your Customer) document management components for the Boosty Platform.

## Components Overview

### DocumentUpload
A comprehensive drag-and-drop file upload component with validation support.

**Features:**
- Drag-and-drop file upload
- Multiple file selection
- File type and size validation
- Upload progress tracking
- Error handling and display
- Integration with document type validation rules

**Props:**
- `onUpload`: Function to handle file uploads
- `documentType`: Type of document being uploaded (for validation)
- `maxFileSize`: Maximum file size allowed (default: 10MB)
- `acceptedTypes`: Array of accepted file extensions
- `multiple`: Allow multiple file selection

### DocumentPreview
A modal component for previewing uploaded documents with AI analysis integration.

**Features:**
- Image and PDF preview
- Zoom and rotation controls for images
- AI analysis results display
- Verification/rejection actions
- Support for multiple file formats

**Props:**
- `document`: Document object to preview
- `onClose`: Function to close preview
- `onVerify`: Function to verify document
- `onReject`: Function to reject document
- `showActions`: Whether to show action buttons
- `aiAnalysis`: AI analysis results

### DocumentVerification
A comprehensive document verification workflow component.

**Features:**
- Document information display
- AI analysis results visualization
- Verification notes and flags
- Rejection reasons
- Verification history tracking
- Bulk operations support

**Props:**
- `document`: Document to verify
- `onVerify`: Function to verify document
- `onReject`: Function to reject document
- `onFlagForReview`: Function to flag for review
- `verificationHistory`: Array of verification history
- `isLoading`: Loading state

### KYCDashboard
A dashboard component for overall KYC status overview and analytics.

**Features:**
- Key metrics display with trends
- Document type breakdown
- Performance metrics
- Expiry tracking
- AI analytics insights
- Quality trends visualization
- Time range filtering

**Props:**
- `kycMetrics`: KYC metrics data
- `isLoading`: Loading state
- `onRefresh`: Function to refresh data
- `dateRange`: Current date range
- `onDateRangeChange`: Function to change date range

## Enhanced InvestorKYCPage

The main KYC management page has been enhanced with:

### New Features
1. **Enhanced Document Upload**
   - Drag-and-drop interface
   - Real-time file validation
   - Multiple file support
   - Progress tracking

2. **Document Preview Modal**
   - Full document preview with zoom/rotate
   - AI analysis results display
   - Quick verification actions

3. **Document Verification Workflow**
   - Comprehensive verification interface
   - AI-powered insights
   - Flagging system
   - Verification history

4. **KYC Dashboard**
   - Real-time metrics
   - Performance analytics
   - Expiry tracking
   - AI insights

5. **Bulk Operations**
   - Select multiple documents
   - Bulk verify/reject
   - Document comparison

6. **Real-time Updates**
   - WebSocket integration
   - Live status updates
   - Activity notifications
   - Expiry alerts

7. **Document Type Validation**
   - Type-specific validation rules
   - File format restrictions
   - Size limits
   - Required field validation

## API Enhancements

### New KYC Methods
- `verifyKYCDocument`: Enhanced with verification data
- `rejectKYCDocument`: Reject with reasons
- `flagKYCDocument`: Flag for review
- `getDocumentHistory`: Get verification history
- `compareDocuments`: Compare multiple documents
- `getKYCMetrics`: Get dashboard metrics
- `getKYCPerformanceReport`: Performance analytics
- `getKYCAnalytics`: AI insights
- `getExpiringDocuments`: Expiry tracking
- `getFlaggedDocuments`: Flagged documents
- `bulkVerifyDocuments`: Bulk verification
- `bulkRejectDocuments`: Bulk rejection
- `getDocumentAIAnalysis`: AI analysis results
- `rerunAIAnalysis`: Re-run AI analysis
- `getDocumentTypeRules`: Validation rules
- `validateDocument`: Document validation

## Utility Functions

### Document Validation (`documentValidation.js`)
Comprehensive document validation system with:
- Type-specific validation rules
- File format validation
- Size restrictions
- Required field validation
- Expiry checking
- AI score validation

### Real-time KYC (`realtimeKYC.js`)
Real-time update system with:
- WebSocket integration
- Polling fallback
- Event listeners
- React hooks
- Connection management
- Automatic reconnection

## Integration

### Context Integration
All components integrate with the existing `InvestorContext` for:
- State management
- API calls
- Error handling
- Loading states

### Styling
Components use Tailwind CSS with consistent:
- Color scheme
- Spacing
- Typography
- Responsive design
- Accessibility features

## Usage Examples

```jsx
// Document Upload
<DocumentUpload
  onUpload={handleUpload}
  documentType="passport"
  multiple={true}
/>

// Document Preview
<DocumentPreview
  document={selectedDocument}
  onVerify={handleVerify}
  aiAnalysis={aiData}
/>

// Document Verification
<DocumentVerification
  document={document}
  onVerify={handleVerify}
  verificationHistory={history}
/>

// KYC Dashboard
<KYCDashboard
  kycMetrics={metrics}
  onRefresh={refreshData}
/>
```

## Features Summary

1. **Enhanced Upload Experience**
   - Drag-and-drop interface
   - Real-time validation
   - Progress tracking
   - Error handling

2. **Advanced Document Management**
   - Preview with controls
   - AI analysis integration
   - Verification workflow
   - History tracking

3. **Real-time Updates**
   - Live status changes
   - Activity notifications
   - Expiry alerts
   - Connection status

4. **Bulk Operations**
   - Multi-select interface
   - Bulk verification
   - Document comparison
   - Batch actions

5. **Analytics Dashboard**
   - Performance metrics
   - Trend analysis
   - AI insights
   - Expiry tracking

6. **Validation System**
   - Type-specific rules
   - File validation
   - Data validation
   - Expiry checks

This comprehensive KYC management system provides an efficient, user-friendly interface for managing investor verification documents with advanced features like AI analysis, real-time updates, and bulk operations.