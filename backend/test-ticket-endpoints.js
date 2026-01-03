// Simple test script to verify ticket endpoints
import express from 'express';
import mongoose from 'mongoose';
import Ticket from './src/models/metrics/ticket.model.js';
import { formatSuccessResponse, formatErrorResponse } from './src/utils/metrics/responseFormatter.util.js';

// Test configuration
const app = express();
app.use(express.json());

// Mock user for testing
const mockUser = { id: '507f1f77bcf86cd799439011' };

// Test database connection
const connectDB = async () => {
  try {
    // Use local MongoDB for testing
    await mongoose.connect('mongodb://localhost:27017/boosty_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB for testing');
  } catch (error) {
    console.log('MongoDB not available, using mock data for testing');
  }
};

// Test ticket creation
app.post('/test/tickets', async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      createdBy: mockUser.id,
      createdAt: new Date()
    };

    const ticket = new Ticket(ticketData);
    await ticket.save();

    // Add initial activity log
    await ticket.addActivityLog(
      'created',
      'Ticket created',
      ticket.createdBy,
      { initialData: ticketData }
    );

    return res.status(201).json(formatSuccessResponse(ticket, { test: true }));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error));
  }
});

// Test ticket listing
app.get('/test/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    const response = {
      data: tickets.map(ticket => ({
        id: ticket._id,
        ticketId: ticket.ticketId,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
        createdBy: ticket.createdBy,
        createdAt: ticket.createdAt,
        isOpen: ticket.isOpen,
        isOverdue: ticket.isOverdue
      }))
    };

    return res.json(formatSuccessResponse(response, { test: true }));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error));
  }
});

// Test ticket details
app.get('/test/tickets/:ticketId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, { test: true }, 404));
    }

    const response = {
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
        createdBy: ticket.createdBy,
        createdAt: ticket.createdAt,
        virtuals: {
          isOpen: ticket.isOpen,
          isResolved: ticket.isResolved,
          isOverdue: ticket.isOverdue,
          resolutionTime: ticket.resolutionTime,
          attachmentCount: ticket.attachmentCount
        }
      }
    };

    return res.json(formatSuccessResponse(response, { test: true }));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error));
  }
});

// Test ticket metrics
app.get('/test/tickets/metrics', async (req, res) => {
  try {
    const [
      totalTickets,
      openTickets,
      closedTickets,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      Ticket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      Ticket.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ])
    ]);

    const response = {
      summary: {
        totalTickets,
        openTickets,
        closedTickets
      },
      breakdowns: {
        status: ticketsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        priority: ticketsByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        category: ticketsByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    };

    return res.json(formatSuccessResponse(response, { test: true }));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error));
  }
});

// Create sample ticket data
const createSampleData = async () => {
  try {
    const sampleTickets = [
      {
        title: 'Login Issue',
        description: 'User cannot login to the platform',
        status: 'open',
        priority: 'high',
        category: 'technical',
        tags: ['login', 'authentication'],
        createdBy: mockUser.id
      },
      {
        title: 'Billing Question',
        description: 'Question about invoice #12345',
        status: 'in-progress',
        priority: 'medium',
        category: 'billing',
        tags: ['billing', 'invoice'],
        assignedTo: mockUser.id,
        createdBy: mockUser.id
      },
      {
        title: 'Feature Request',
        description: 'Add dark mode to the dashboard',
        status: 'resolved',
        priority: 'low',
        category: 'feature-request',
        tags: ['feature', 'ui'],
        resolution: 'Feature added to backlog',
        resolvedBy: mockUser.id,
        resolvedAt: new Date(),
        createdBy: mockUser.id
      }
    ];

    for (const ticketData of sampleTickets) {
      const ticket = new Ticket(ticketData);
      await ticket.save();
      console.log(`Created sample ticket: ${ticket.ticketId}`);
    }

    console.log('Sample data created successfully');
  } catch (error) {
    console.log('Error creating sample data:', error.message);
  }
};

// Start test server
const startTestServer = async () => {
  await connectDB();
  
  // Create sample data if database is available
  if (mongoose.connection.readyState === 1) {
    await createSampleData();
  }

  const port = 7001;
  app.listen(port, () => {
    console.log(`\n🧪 Ticket API Test Server running on port ${port}`);
    console.log('\n📋 Available test endpoints:');
    console.log('  POST   /test/tickets           - Create a new ticket');
    console.log('  GET    /test/tickets           - List all tickets');
    console.log('  GET    /test/tickets/:id       - Get ticket details');
    console.log('  GET    /test/tickets/metrics    - Get ticket metrics');
    console.log('\n💡 Example requests:');
    console.log('  curl -X POST http://localhost:7001/test/tickets \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"title":"Test Ticket","description":"Test description","category":"technical","priority":"medium"}\'');
    console.log('\n  curl http://localhost:7001/test/tickets');
    console.log('\n  curl http://localhost:7001/test/tickets/metrics');
  });
};

startTestServer().catch(console.error);