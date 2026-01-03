import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  Mail, 
  Phone, 
  Clock, 
  BarChart3, 
  Users, 
  Settings,
  Search,
  Filter,
  Plus,
  MoreVertical,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';

export default function EnhancedCrmDashboard() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  
  // Enhanced ticket data with more fields
  const tickets = [
    {
      id: 1,
      title: "Question about solar panel installation timeline",
      from: "Ngozi Okafor (USR-5001)",
      preview: "Hi, I purchased a 5kW system last week and wanted to know when the installation will begin...",
      timestamp: "2025-01-14 10:30 AM",
      assignedTo: "Support Team",
      assignedToAvatar: null,
      priority: "High",
      status: "Open",
      icon: "message",
      category: "Installation",
      unread: true,
      lastMessage: "2025-01-14 10:30 AM",
      threadCount: 3,
      customerType: "User",
      contactInfo: {
        email: "ngozi.okafor@example.com",
        phone: "+234-802-123-4567"
      }
    },
    {
      id: 2,
      title: "Technical support - system not charging",
      from: "Blessing Okoro (USR-5005)",
      preview: "Customer called reporting that their solar system is not charging the battery properly...",
      timestamp: "2025-01-14 08:45 AM",
      assignedTo: "Technical Team",
      assignedToAvatar: null,
      priority: "High",
      status: "In Progress",
      icon: "phone",
      category: "Technical",
      unread: false,
      lastMessage: "2025-01-14 09:15 AM",
      threadCount: 5,
      customerType: "User",
      contactInfo: {
        email: "blessing.okoro@example.com",
        phone: "+234-803-234-5678"
      }
    },
    {
      id: 3,
      title: "Payment confirmation inquiry",
      from: "Tunde Bakare (USR-5002)",
      preview: "I made a payment yesterday but I haven't received confirmation yet...",
      timestamp: "2025-01-14 14:09 PM",
      assignedTo: "Finance Team",
      assignedToAvatar: null,
      priority: "Medium",
      status: "In Progress",
      icon: "message",
      category: "Payment",
      unread: true,
      lastMessage: "2025-01-14 14:09 PM",
      threadCount: 2,
      customerType: "User",
      contactInfo: {
        email: "tunde.bakare@example.com",
        phone: "+234-804-345-6789"
      }
    },
    {
      id: 4,
      title: "Request for investment information",
      from: "Adebayo Okonkwo (INV-1234)",
      preview: "I'm interested in learning more about investment opportunities in solar projects...",
      timestamp: "2025-01-13 15:20 PM",
      assignedTo: "Sales Team",
      assignedToAvatar: null,
      priority: "Low",
      status: "Resolved",
      icon: "message",
      category: "Investment",
      unread: false,
      lastMessage: "2025-01-13 16:45 PM",
      threadCount: 4,
      customerType: "Investor",
      contactInfo: {
        email: "adebayo.okonkwo@example.com",
        phone: "+234-805-456-7890"
      }
    },
    {
      id: 5,
      title: "Billing discrepancy",
      from: "Chidi Eze (USR-5004)",
      preview: "There seems to be a discrepancy with my last invoice. Could you help me verify it?",
      timestamp: "2025-01-14 11:00 AM",
      assignedTo: "Finance Team",
      assignedToAvatar: null,
      priority: "Medium",
      status: "Resolved",
      icon: "message",
      category: "Billing",
      unread: false,
      lastMessage: "2025-01-14 13:30 PM",
      threadCount: 3,
      customerType: "User",
      contactInfo: {
        email: "chidi.eze@example.com",
        phone: "+234-806-567-8901"
      }
    },
    {
      id: 6,
      title: "Product catalog request",
      from: "Amina Yusuf (USR-5003)",
      preview: "Could you please send me the latest product catalog with pricing?",
      timestamp: "2025-01-12 14:15 PM",
      assignedTo: "Sales Team",
      assignedToAvatar: null,
      priority: "Low",
      status: "Closed",
      icon: "message",
      category: "Sales",
      unread: false,
      lastMessage: "2025-01-12 16:00 PM",
      threadCount: 2,
      customerType: "User",
      contactInfo: {
        email: "amina.yusuf@example.com",
        phone: "+234-807-678-9012"
      }
    }
  ];

  // Enhanced stats with trends
  const stats = [
    { 
      label: "Total Messages", 
      value: "2,847", 
      icon: MessageSquare,
      trend: "+12%",
      trendDirection: "up"
    },
    { 
      label: "Open Tickets", 
      value: "34", 
      icon: Mail, 
      highlight: true,
      trend: "+5%",
      trendDirection: "up"
    },
    { 
      label: "Resolved Today", 
      value: "18", 
      icon: MessageSquare, 
      success: true,
      trend: "+23%",
      trendDirection: "up"
    },
    { 
      label: "Avg Response Time", 
      value: "2.4h", 
      icon: Phone,
      trend: "-15%",
      trendDirection: "down"
    }
  ];

  const filters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Resolved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Technical': return AlertCircle;
      case 'Payment': return CheckCircle;
      case 'Investment': return BarChart3;
      case 'Billing': return Mail;
      case 'Sales': return Users;
      default: return MessageSquare;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = activeFilter === 'All' || ticket.status === activeFilter;
    const matchesSearch = searchQuery === '' || 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.preview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleBack = () => {
    console.log('Navigate back');
    alert('Navigating back');
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleNewTicket = () => {
    console.log('Create new ticket');
    alert('Opening new ticket form');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="hover:bg-gray-100 transition-colors p-2 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <img 
              src="/boosty_logo.png" 
              alt="Boosty Logo" 
              className="h-10"
            />
          </div>
          <button className="hover:bg-gray-100 transition-colors p-2 rounded-lg">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            CRM & Communications
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage customer communications, support tickets, and outreach campaigns
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets, customers, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex items-end justify-between">
                <div className={`text-2xl font-bold ${
                  stat.highlight ? 'text-red-600' : 
                  stat.success ? 'text-green-600' : 
                  'text-gray-900'
                }`}>
                  {stat.value}
                </div>
                {stat.trend && (
                  <div className={`flex items-center text-xs ${
                    stat.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trendDirection === 'up' ? '↑' : '↓'} {stat.trend}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Communications Section */}
      <div className="px-6 py-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">
            Communications
          </h2>
          <button 
            onClick={handleNewTicket}
            className="flex items-center gap-1 bg-yellow-400 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="space-y-3 pb-24">
          {filteredTickets.map((ticket) => {
            const CategoryIcon = getCategoryIcon(ticket.category);
            return (
              <div 
                key={ticket.id} 
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTicketClick(ticket)}
              >
                {/* Ticket Header */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="mt-1 relative">
                    {ticket.icon === 'phone' ? (
                      <Phone className="w-5 h-5 text-blue-500" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    )}
                    {ticket.unread && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-bold text-gray-900 flex-1">
                        {ticket.title}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      From: {ticket.from}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                      {ticket.preview}
                    </p>
                  </div>
                </div>

                {/* Ticket Meta */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 ml-8">
                  <Clock className="w-3 h-3" />
                  <span>{ticket.timestamp}</span>
                  <span>•</span>
                  <span>Assigned to {ticket.assignedTo}</span>
                  <span>•</span>
                  <span>{ticket.threadCount} messages</span>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 ml-8 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {ticket.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                    {ticket.customerType}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1 text-yellow-500">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs">Investment</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <Users className="w-6 h-6" />
            <span className="text-xs">Consumer</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-6 h-6" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showTicketDetails && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Ticket Details</h2>
                <button 
                  onClick={() => setShowTicketDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {selectedTicket.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <User className="w-4 h-4" />
                    <span>{selectedTicket.from}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Priority</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Category</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Customer Type</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                      {selectedTicket.customerType}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Message Preview</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedTicket.preview}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Contact Information</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Email:</span> {selectedTicket.contactInfo.email}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Phone:</span> {selectedTicket.contactInfo.phone}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                    <p className="text-sm text-gray-700">{selectedTicket.assignedTo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Message</p>
                    <p className="text-sm text-gray-700">{selectedTicket.lastMessage}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 bg-yellow-400 text-gray-900 py-3 rounded-lg font-medium hover:bg-yellow-500 transition-colors">
                    Reply
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    Assign
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}