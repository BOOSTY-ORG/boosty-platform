# Messaging Components

A comprehensive set of React components for implementing a direct messaging system with real-time updates, assignment management, and advanced features.

## Overview

The messaging components provide a complete solution for implementing a modern messaging interface with:

- Real-time message threads with WebSocket support
- Advanced message composition with formatting and attachments
- Assignment management and workload distribution
- SLA compliance monitoring
- Responsive design for all screen sizes
- Accessibility features and keyboard navigation

## Components

### MessageThreadList

Displays a list of message threads with filtering, pagination, and status indicators.

**Features:**
- Thread list with filtering and sorting
- Thread status indicators (active, closed, archived)
- Priority indicators and unread counts
- Bulk selection and operations
- Search functionality
- Responsive design for mobile and desktop

**Props:**
```javascript
{
  className: 'String - Additional CSS classes',
  initialFilters: 'Object - Initial filter state',
  onThreadSelect: 'Function - Callback for thread selection',
  showFilters: 'Boolean - Show filter controls',
  showSearch: 'Boolean - Show search bar',
  compact: 'Boolean - Compact view mode'
}
```

**Usage:**
```jsx
import { MessageThreadList } from '@/components/messaging';

<MessageThreadList
  onThreadSelect={(thread) => console.log('Selected thread:', thread)}
  showFilters={true}
  showSearch={true}
/>
```

### MessageThread

Displays an individual message thread with messages in chronological order.

**Features:**
- Message display with sender avatars and timestamps
- Read/unread indicators
- Message reactions and delivery status
- Real-time message updates
- Typing indicators
- Message composition and sending
- File attachment support
- Message search and filtering

**Props:**
```javascript
{
  threadId: 'String - Thread ID to display',
  className: 'String - Additional CSS classes',
  onMessageSend: 'Function - Callback for message sending',
  onThreadUpdate: 'Function - Callback for thread updates',
  showComposer: 'Boolean - Show message composer',
  autoRefresh: 'Boolean - Auto-refresh messages',
  refreshInterval: 'Number - Refresh interval in seconds'
}
```

**Usage:**
```jsx
import { MessageThread } from '@/components/messaging';

<MessageThread
  threadId="thread-123"
  onMessageSend={(message) => console.log('Message sent:', message)}
  autoRefresh={true}
  refreshInterval={30}
/>
```

### MessageComposer

Comprehensive message composer with text input, formatting options, and file attachments.

**Features:**
- Rich text formatting options
- Emoji picker and support
- File attachment capability
- Message templates
- Draft message saving
- Typing indicators
- Keyboard shortcuts
- Accessibility features

**Props:**
```javascript
{
  threadId: 'String - Thread ID for message',
  onSend: 'Function - Callback for message sending',
  onTyping: 'Function - Callback for typing indicator',
  onDraftSave: 'Function - Callback for draft saving',
  placeholder: 'String - Input placeholder text',
  disabled: 'Boolean - Disable composer',
  showFormatting: 'Boolean - Show formatting options',
  showAttachments: 'Boolean - Show attachment options',
  showTemplates: 'Boolean - Show template options',
  showEmoji: 'Boolean - Show emoji picker',
  replyTo: 'Object - Message being replied to',
  initialDraft: 'String - Initial draft content'
}
```

**Usage:**
```jsx
import { MessageComposer } from '@/components/messaging';

<MessageComposer
  threadId="thread-123"
  onSend={(messageData) => sendMessage(messageData)}
  onTyping={(isTyping) => sendTypingIndicator(isTyping)}
  showFormatting={true}
  showAttachments={true}
/>
```

### AssignmentDashboard

Displays assignment metrics, agent workload distribution, and SLA compliance.

**Features:**
- Assignment metrics and KPIs
- Agent workload distribution
- SLA compliance monitoring
- Assignment status overview
- Bulk assignment operations
- Transfer and escalation actions
- Performance analytics
- Interactive charts and visualizations

**Props:**
```javascript
{
  className: 'String - Additional CSS classes',
  filters: 'Object - Initial filters',
  onAssignmentSelect: 'Function - Callback for assignment selection',
  onAgentSelect: 'Function - Callback for agent selection',
  showMetrics: 'Boolean - Show metrics cards',
  showCharts: 'Boolean - Show charts and visualizations',
  showFilters: 'Boolean - Show filter controls'
}
```

**Usage:**
```jsx
import { AssignmentDashboard } from '@/components/messaging';

<AssignmentDashboard
  onAssignmentSelect={(assignment) => console.log('Selected assignment:', assignment)}
  showMetrics={true}
  showCharts={true}
/>
```

### AssignmentDetails

Shows detailed assignment information with performance metrics and management actions.

**Features:**
- Comprehensive assignment information
- Performance metrics display
- Assignment history tracking
- Transfer and escalation actions
- Assignment completion workflow
- SLA status monitoring
- Custom fields support
- Agent workload indicators

**Props:**
```javascript
{
  assignmentId: 'String - Assignment ID to display',
  className: 'String - Additional CSS classes',
  onUpdate: 'Function - Callback for assignment updates',
  onTransfer: 'Function - Callback for assignment transfer',
  onEscalate: 'Function - Callback for assignment escalation',
  onComplete: 'Function - Callback for assignment completion',
  showActions: 'Boolean - Show action buttons',
  showHistory: 'Boolean - Show assignment history',
  showMetrics: 'Boolean - Show performance metrics'
}
```

**Usage:**
```jsx
import { AssignmentDetails } from '@/components/messaging';

<AssignmentDetails
  assignmentId="assignment-123"
  onTransfer={(assignment) => transferAssignment(assignment)}
  onEscalate={(assignment) => escalateAssignment(assignment)}
  showActions={true}
/>
```

## State Management

The messaging components use the `MessagingContext` for centralized state management.

### Using MessagingContext

```jsx
import { useMessaging } from '@/context/MessagingContext';

function MyComponent() {
  const {
    // Thread state
    threads,
    currentThread,
    threadMessages,
    
    // Message state
    sendingMessage,
    
    // Assignment state
    assignments,
    currentAssignment,
    
    // Real-time state
    onlineUsers,
    typingUsers,
    
    // Actions
    getThreads,
    sendMessage,
    getAssignments,
    subscribeToMessages,
  } = useMessaging();
  
  // Use state and actions
}
```

### Context Provider

Wrap your application with the `MessagingProvider`:

```jsx
import { MessagingProvider } from '@/context/MessagingContext';

function App() {
  return (
    <MessagingProvider>
      <YourAppComponents />
    </MessagingProvider>
  );
}
```

## API Integration

The components integrate with the CRM API functions defined in `@/api/crm.js`:

```javascript
import { crmAPI } from '@/api/crm';

// Thread operations
await crmAPI.getMessageThreads(params);
await crmAPI.getMessageThread(threadId);
await crmAPI.createMessageThread(threadData);
await crmAPI.updateMessageThread(threadId, updateData);

// Message operations
await crmAPI.getThreadMessages(threadId, params);
await crmAPI.sendMessage(messageData);
await crmAPI.markMessageAsRead(messageId);

// Assignment operations
await crmAPI.getAssignments(params);
await crmAPI.getAssignment(assignmentId);
await crmAPI.transferAssignment(assignmentId, transferData);
await crmAPI.escalateAssignment(assignmentId, escalationData);
```

## Real-time Updates

The messaging system supports real-time updates through WebSocket connections:

```javascript
// Subscribe to message updates
const subscription = crmAPI.subscribeToMessages(threadId, (message) => {
  console.log('New message:', message);
});

// Unsubscribe when done
subscription.unsubscribe();

// Send typing indicators
await crmAPI.sendTypingIndicator(threadId, true);
```

## Styling

The components use Tailwind CSS for styling and can be customized through:

1. **CSS Classes**: Pass custom classes via the `className` prop
2. **Theme Colors**: Modify Tailwind color configuration
3. **Component Overrides**: Use CSS specificity to override styles

### Custom CSS Example

```css
/* Custom message thread styling */
.message-thread .message-bubble {
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Custom assignment dashboard styling */
.assignment-dashboard .metric-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## Accessibility

The components follow WCAG 2.1 guidelines and include:

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

### Keyboard Shortcuts

- `Enter`: Send message (without Shift)
- `Shift + Enter`: New line in message composer
- `Escape`: Close modals and dropdowns
- `Tab/Shift + Tab`: Navigate between interactive elements

## Performance Optimization

The components are optimized for performance with:

- Lazy loading of messages
- Virtual scrolling for large lists
- Memoization of expensive calculations
- Debounced search and typing indicators
- Efficient re-rendering with React hooks

## Error Handling

Components include comprehensive error handling:

- Network error detection
- Retry mechanisms
- User-friendly error messages
- Fallback UI states
- Error boundary integration

## Testing

The components are designed for easy testing:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageThreadList } from '@/components/messaging';

test('renders thread list', () => {
  render(<MessageThreadList />);
  expect(screen.getByText('Message Threads')).toBeInTheDocument();
});
```

## Browser Support

The components support all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to the messaging components:

1. Follow the existing code style and patterns
2. Add TypeScript-like JSDoc comments
3. Include accessibility attributes
4. Write tests for new features
5. Update documentation

## Examples

See the `MessagingPage` component for a complete integration example:

```jsx
import MessagingPage from '@/pages/MessagingPage';

// Basic usage
<MessagingPage />

// With initial state
<MessagingPage
  initialView="threads"
  initialThreadId="thread-123"
/>
```

## Troubleshooting

### Common Issues

1. **Messages not updating in real-time**
   - Check WebSocket connection
   - Verify subscription is active
   - Ensure proper context provider setup

2. **File uploads failing**
   - Check file size limits
   - Verify allowed file types
   - Ensure proper API configuration

3. **Assignment actions not working**
   - Verify user permissions
   - Check API endpoints
   - Ensure proper error handling

### Debug Mode

Enable debug mode by setting environment variable:

```javascript
process.env.REACT_APP_MESSAGING_DEBUG = true;
```

This will log detailed information to the console for troubleshooting.

## License

These components are part of the Boosty Platform and follow the project's licensing terms.