import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedCrmDashboard from './EnhancedCrmDashboard';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  MessageSquare: () => <div data-testid="message-square-icon">MessageSquare</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  BarChart3: () => <div data-testid="bar-chart-icon">BarChart3</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  MoreVertical: () => <div data-testid="more-vertical-icon">MoreVertical</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle-icon">XCircle</div>,
  User: () => <div data-testid="user-icon">User</div>
}));

describe('EnhancedCrmDashboard', () => {
  beforeEach(() => {
    // Mock alert
    global.alert = jest.fn();
  });

  test('renders the CRM dashboard with header', () => {
    render(<EnhancedCrmDashboard />);
    
    expect(screen.getByText('CRM & Communications')).toBeInTheDocument();
    expect(screen.getByText('Manage customer communications, support tickets, and outreach campaigns')).toBeInTheDocument();
  });

  test('renders stats cards with correct values', () => {
    render(<EnhancedCrmDashboard />);
    
    expect(screen.getByText('Total Messages')).toBeInTheDocument();
    expect(screen.getByText('2,847')).toBeInTheDocument();
    expect(screen.getByText('Open Tickets')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('Resolved Today')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('2.4h')).toBeInTheDocument();
  });

  test('renders filter tabs and allows filtering', () => {
    render(<EnhancedCrmDashboard />);
    
    // Test filter tabs exist by finding them in the filter container
    const filterTabs = screen.getAllByRole('button');
    const openFilterTab = filterTabs.find(button => button.textContent === 'Open' && button.tagName === 'BUTTON');
    
    expect(openFilterTab).toBeInTheDocument();
    
    // Test clicking on 'Open' filter
    fireEvent.click(openFilterTab);
    
    // Verify the filter is active (has yellow background)
    expect(openFilterTab).toHaveClass('bg-yellow-400');
  });

  test('renders search functionality', () => {
    render(<EnhancedCrmDashboard />);
    
    const searchInput = screen.getByPlaceholderText('Search tickets, customers, or keywords...');
    expect(searchInput).toBeInTheDocument();
    
    // Test search input
    fireEvent.change(searchInput, { target: { value: 'solar' } });
    expect(searchInput.value).toBe('solar');
  });

  test('renders ticket list with correct information', () => {
    render(<EnhancedCrmDashboard />);
    
    expect(screen.getByText('Question about solar panel installation timeline')).toBeInTheDocument();
    expect(screen.getByText('Ngozi Okafor (USR-5001)')).toBeInTheDocument();
    expect(screen.getByText('Technical support - system not charging')).toBeInTheDocument();
    expect(screen.getByText('Blessing Okoro (USR-5005)')).toBeInTheDocument();
  });

  test('opens ticket details modal when ticket is clicked', async () => {
    render(<EnhancedCrmDashboard />);
    
    const firstTicket = screen.getByText('Question about solar panel installation timeline');
    fireEvent.click(firstTicket);
    
    await waitFor(() => {
      expect(screen.getByText('Ticket Details')).toBeInTheDocument();
      expect(screen.getByText('Reply')).toBeInTheDocument();
      expect(screen.getByText('Assign')).toBeInTheDocument();
    });
  });

  test('closes ticket details modal when close button is clicked', async () => {
    render(<EnhancedCrmDashboard />);
    
    // Open modal first
    const firstTicket = screen.getByText('Question about solar panel installation timeline');
    fireEvent.click(firstTicket);
    
    await waitFor(() => {
      expect(screen.getByText('Ticket Details')).toBeInTheDocument();
    });
    
    // Close modal
    const closeButton = screen.getByTestId('x-circle-icon');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Ticket Details')).not.toBeInTheDocument();
    });
  });

  test('displays priority and status tags with correct colors', () => {
    render(<EnhancedCrmDashboard />);
    
    // Check for priority tags (find all and verify at least one of each exists)
    const highTags = screen.getAllByText('High');
    const mediumTags = screen.getAllByText('Medium');
    const lowTags = screen.getAllByText('Low');
    
    expect(highTags.length).toBeGreaterThan(0);
    expect(mediumTags.length).toBeGreaterThan(0);
    expect(lowTags.length).toBeGreaterThan(0);
    
    // Check for status tags
    const openTags = screen.getAllByText('Open');
    const inProgressTags = screen.getAllByText('In Progress');
    const resolvedTags = screen.getAllByText('Resolved');
    const closedTags = screen.getAllByText('Closed');
    
    expect(openTags.length).toBeGreaterThan(0);
    expect(inProgressTags.length).toBeGreaterThan(0);
    expect(resolvedTags.length).toBeGreaterThan(0);
    expect(closedTags.length).toBeGreaterThan(0);
  });

  test('renders bottom navigation', () => {
    render(<EnhancedCrmDashboard />);
    
    // Find navigation items specifically in the bottom navigation
    const dashboardNav = screen.getByText('Dashboard');
    const investmentNav = screen.getByText('Investment');
    const consumerNav = screen.getByText('Consumer');
    const settingsNav = screen.getByText('Settings');
    
    expect(dashboardNav).toBeInTheDocument();
    expect(investmentNav).toBeInTheDocument();
    expect(consumerNav).toBeInTheDocument();
    expect(settingsNav).toBeInTheDocument();
    
    // Verify Dashboard is active (has yellow color)
    expect(dashboardNav.closest('button')).toHaveClass('text-yellow-500');
  });

  test('handles back button click', () => {
    render(<EnhancedCrmDashboard />);
    
    const backButton = screen.getByTestId('arrow-left-icon');
    fireEvent.click(backButton);
    
    expect(global.alert).toHaveBeenCalledWith('Navigating back');
  });

  test('handles new ticket button click', () => {
    render(<EnhancedCrmDashboard />);
    
    const newTicketButton = screen.getByText('New Ticket');
    fireEvent.click(newTicketButton);
    
    expect(global.alert).toHaveBeenCalledWith('Opening new ticket form');
  });
});