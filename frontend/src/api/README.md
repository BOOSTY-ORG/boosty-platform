# CRM API Integration

This directory contains the frontend API integration for the CRM contact management system. The implementation provides a comprehensive interface to interact with the CRM backend endpoints, including contacts, communications, templates, and automation modules.

## Files Overview

### [`crm.js`](./crm.js)
The main CRM API module that provides direct access to all CRM endpoints. This file contains the raw API functions that map 1:1 to the backend endpoints.

### [`../services/crm.service.js`](../services/crm.service.js)
A service layer that wraps the CRM API with additional functionality:
- Data transformation and validation
- Caching with TTL and LRU eviction
- Error handling with user-friendly messages
- Retry logic for failed requests
- Analytics and metrics helpers

### [`../types/crm.types.js`](../types/crm.types.js)
TypeScript-style type definitions for better IDE support and documentation. Includes JSDoc comments for all CRM data structures.

### [`index.js`](./index.js)
The main API configuration file with:
- Axios instance setup
- Request/response interceptors
- Authentication handling
- Mock responses for development
- Error handling

## Usage Examples

### Using the CRM API Directly

```javascript
import { crmAPI } from './api/crm.js';

// Get contacts with pagination
const contacts = await crmAPI.getContactsList({
  page: 1,
  limit: 20,
  status: 'active'
});

// Create a new contact
const newContact = await crmAPI.createContact({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  contactType: 'lead'
});
```

### Using the CRM Service (Recommended)

```javascript
import crmService from '../services/crm.service.js';

// Get contacts with transformation and caching
const contacts = await crmService.getContacts({
  page: 1,
  limit: 20,
  status: 'active'
});

// Create a contact with validation
const newContact = await crmService.createContact({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  contactType: 'lead'
});

// Get contact by ID with computed scores
const contact = await crmService.getContactById('contact_001');
console.log(contact.engagementScore); // 0-100
console.log(contact.leadScore); // 0-100
```

## API Modules

### CRM Overview
- `getCRMOverview()` - Get system overview and metrics
- `getCRMHealth()` - Check system health

### Contacts
- `getContactMetrics()` - Get contact analytics
- `getContactsList()` - Get paginated contacts
- `searchContacts()` - Search contacts
- `getContactById()` - Get contact by ID
- `createContact()` - Create new contact
- `updateContact()` - Update contact
- `deleteContact()` - Delete contact
- `updateContactEngagement()` - Update engagement metrics
- `giveMarketingConsent()` - Give marketing consent
- `withdrawConsent()` - Withdraw consent
- `assignContact()` - Assign to user
- `addContactTag()` - Add tag
- `removeContactTag()` - Remove tag
- `findContactByEmail()` - Find by email
- `getHighValueLeads()` - Get high-value leads
- `getUnassignedContacts()` - Get unassigned contacts
- `getContactsNeedingFollowUp()` - Get contacts needing follow-up
- `getContactStats()` - Get statistics
- `importContacts()` - Bulk import
- `exportContacts()` - Export contacts
- `findDuplicateContacts()` - Find duplicates
- `mergeDuplicateContacts()` - Merge duplicates
- `bulkUpdateContacts()` - Bulk update
- `bulkAssignContacts()` - Bulk assign
- `bulkDeleteContacts()` - Bulk delete

### Communications
- `getCommunicationMetrics()` - Get communication analytics
- `getCommunicationsList()` - Get paginated communications
- `searchCommunications()` - Search communications
- `getCommunicationById()` - Get by ID
- `createCommunication()` - Create communication
- `updateCommunication()` - Update communication
- `deleteCommunication()` - Delete communication
- `markResponseReceived()` - Mark response received
- `addFollowUp()` - Add follow-up
- `completeFollowUp()` - Complete follow-up
- `getCommunicationsByEntity()` - Get by entity
- `getOverdueResponses()` - Get overdue responses
- `getOverdueFollowUps()` - Get overdue follow-ups
- `getAgentWorkload()` - Get agent workload
- `bulkUpdateCommunications()` - Bulk update
- `bulkDeleteCommunications()` - Bulk delete

### Templates
- `getTemplateMetrics()` - Get template analytics
- `getTemplatesList()` - Get paginated templates
- `searchTemplates()` - Search templates
- `getTemplateById()` - Get by ID
- `createTemplate()` - Create template
- `updateTemplate()` - Update template
- `deleteTemplate()` - Delete template
- `approveTemplate()` - Approve template
- `rejectTemplate()` - Reject template
- `createTemplateVersion()` - Create version
- `getTemplatePreview()` - Get preview
- `getTemplatesByCategory()` - Get by category
- `getTopPerformingTemplates()` - Get top performing
- `getTemplateStats()` - Get statistics

### Automations
- `getAutomationMetrics()` - Get automation analytics
- `getAutomationsList()` - Get paginated automations
- `searchAutomations()` - Search automations
- `getAutomationById()` - Get by ID
- `createAutomation()` - Create automation
- `updateAutomation()` - Update automation
- `deleteAutomation()` - Delete automation
- `enableAutomation()` - Enable automation
- `disableAutomation()` - Disable automation
- `testAutomation()` - Test automation
- `executeAutomation()` - Execute manually
- `getAutomationHistory()` - Get execution history
- `getAutomationsByCategory()` - Get by category
- `getAutomationsDueForExecution()` - Get due for execution
- `getTopPerformingAutomations()` - Get top performing
- `getAutomationStats()` - Get statistics
- `bulkEnableAutomations()` - Bulk enable
- `bulkDisableAutomations()` - Bulk disable
- `bulkDeleteAutomations()` - Bulk delete

## Service Features

### Data Validation
The service layer includes comprehensive validation:
- Email format validation
- Phone number format validation
- Required field validation
- Data type validation

### Data Transformation
Automatic data transformation:
- Name capitalization
- Email normalization
- Phone number formatting
- Date object conversion
- Computed fields (fullName, engagementScore, leadScore)

### Caching
Built-in caching with:
- 5-minute TTL
- LRU eviction (max 100 items)
- Cache invalidation on updates
- Cache statistics

### Error Handling
User-friendly error handling:
- Contextual error messages
- Retry logic for server errors
- Authentication handling
- Network error detection

### Analytics
Built-in analytics:
- Engagement score calculation
- Lead score calculation
- Contact metrics
- Performance tracking

## Development Features

### Mock Responses
The API includes mock responses for development when the backend is unavailable:
- CRM overview data
- Sample contacts, communications, templates, automations
- Realistic data structure
- Pagination support

### Error Simulation
The service layer can simulate errors for testing:
- Network errors
- Server errors
- Validation errors
- Authentication errors

## Best Practices

### Using the Service Layer
Always prefer the service layer over direct API calls:
```javascript
// Good
import crmService from '../services/crm.service.js';
const contact = await crmService.getContactById(id);

// Avoid
import { crmAPI } from './api/crm.js';
const contact = await crmAPI.getContactById(id);
```

### Error Handling
Always wrap API calls in try-catch:
```javascript
try {
  const contacts = await crmService.getContacts(params);
  // Handle success
} catch (error) {
  // Handle error (already user-friendly)
  console.error('Failed to get contacts:', error.message);
}
```

### Caching
Control caching behavior:
```javascript
// Use cache (default)
const contact = await crmService.getContactById(id);

// Skip cache
const contact = await crmService.getContactById(id, false);

// Clear cache
crmService.clearCache();
```

### Bulk Operations
Use bulk operations for better performance:
```javascript
// Good for many items
await crmService.bulkUpdateContacts(ids, updateData);

// Avoid for many items
for (const id of ids) {
  await crmService.updateContact(id, updateData);
}
```

## Type Safety

The type definitions provide IntelliSense and documentation:
```javascript
/**
 * @type {import('../types/crm.types').Contact}
 */
const contact = await crmService.getContactById(id);
```

## Testing

The service layer is designed for easy testing:
- Mock responses for offline development
- Error simulation for edge cases
- Cache control for consistent tests
- Validation testing

## Integration with React Components

The service layer integrates seamlessly with React:
```javascript
import { useState, useEffect } from 'react';
import crmService from '../services/crm.service.js';

function ContactList() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadContacts() {
      try {
        const response = await crmService.getContacts();
        setContacts(response.data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, []);

  // Component JSX...
}
```

## Performance Considerations

- Use pagination for large datasets
- Leverage caching for frequently accessed data
- Use bulk operations for multiple updates
- Implement debouncing for search operations
- Clear cache strategically after updates

## Security Notes

- All requests include authentication tokens
- Input validation prevents injection attacks
- Error messages don't expose sensitive information
- Consent management respects privacy regulations