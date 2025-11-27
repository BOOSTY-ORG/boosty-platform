import { useState } from 'react';
import { ArrowLeft, MessageSquare, Mail, Phone, Clock, BarChart3, Users, Settings } from 'lucide-react';

export default function CrmDashboard() {
  const [activeFilter, setActiveFilter] = useState('All');
  
  const tickets = [
    {
      id: 1,
      title: "Question about solar panel installation timeline",
      from: "Ngozi Okafor (USR-5001)",
      preview: "Hi, I purchased a 5kW system last week and wanted to know when the installation will begin...",
      timestamp: "2025-01-14 10:30 AM",
      assignedTo: "Support Team",
      priority: "High",
      status: "Open",
      icon: "message"
    },
    {
      id: 2,
      title: "Technical support - system not charging",
      from: "Blessing Okoro (USR-5005)",
      preview: "Customer called reporting that their solar system is not charging the battery properly...",
      timestamp: "2025-01-14 08:45 AM",
      assignedTo: "Technical Team",
      priority: "High",
      status: "In Progress",
      icon: "phone"
    },
    {
      id: 3,
      title: "Payment confirmation inquiry",
      from: "Tunde Bakare (USR-5002)",
      preview: "I made a payment yesterday but I haven't received confirmation yet...",
      timestamp: "2025-01-14 14:09 PM",
      assignedTo: "Finance Team",
      priority: "Medium",
      status: "In Progress",
      icon: "message"
    },
    {
      id: 4,
      title: "Request for investment information",
      from: "Adebayo Okonkwo (INV-1234)",
      preview: "I'm interested in learning more about investment opportunities in solar projects...",
      timestamp: "2025-01-13 15:20 PM",
      assignedTo: "Sales Team",
      priority: "Low",
      status: "Resolved",
      icon: "message"
    },
    {
      id: 5,
      title: "Billing discrepancy",
      from: "Chidi Eze (USR-5004)",
      preview: "There seems to be a discrepancy with my last invoice. Could you help me verify it?",
      timestamp: "2025-01-14 11:00 AM",
      assignedTo: "Finance Team",
      priority: "Medium",
      status: "Resolved",
      icon: "message"
    },
    {
      id: 6,
      title: "Product catalog request",
      from: "Amina Yusuf (USR-5003)",
      preview: "Could you please send me the latest product catalog with pricing?",
      timestamp: "2025-01-12 14:15 PM",
      assignedTo: "Sales Team",
      priority: "Low",
      status: "Closed",
      icon: "message"
    }
  ];

  const stats = [
    { label: "Total Messages", value: "2,847", icon: MessageSquare },
    { label: "Open Tickets", value: "34", icon: Mail, highlight: true },
    { label: "Resolved Today", value: "18", icon: MessageSquare, success: true },
    { label: "Avg Response Time", value: "2.4h", icon: Phone }
  ];

  const filters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-blue-100 text-blue-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Resolved': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredTickets = activeFilter === 'All' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === activeFilter);

  const handleBack = () => {
    console.log('Navigate back');
    alert('Navigating back');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={handleBack}
            className="hover:bg-gray-100 transition-colors p-1"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <img 
            src="/boosty_logo.png" 
            alt="Boosty Logo" 
            className="h-10"
          />
        </div>

        <div className="mb-2">
          <h1 className="text-xl font-bold text-gray-900">
            CRM & Communications
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage customer communications, support tickets, and outreach campaigns
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className={`text-2xl font-bold ${
                stat.highlight ? 'text-red-600' : 
                stat.success ? 'text-green-600' : 
                'text-gray-900'
              }`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Communications Section */}
      <div className="px-6 py-2">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          Communications
        </h2>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        <div className="space-y-3 pb-24">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-2xl p-4 shadow-sm">
              {/* Ticket Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className="mt-1">
                  {ticket.icon === 'phone' ? (
                    <Phone className="w-5 h-5 text-blue-500" />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">
                    {ticket.title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-1">
                    From: {ticket.from}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
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
              </div>

              {/* Tags */}
              <div className="flex gap-2 ml-8">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
            </div>
          ))}
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
    </div>
  );
}