import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  HomeIcon,
  UserGroupIcon,
  UserIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: HomeIcon,
      roles: ['admin', 'manager', 'finance', 'support', 'user'],
    },
    {
      name: 'Investors',
      path: '/investors',
      icon: UserGroupIcon,
      roles: ['admin', 'manager', 'finance', 'support'],
    },
    {
      name: 'Users',
      path: '/users',
      icon: UserIcon,
      roles: ['admin', 'manager', 'support'],
    },
    {
      name: 'Payments',
      path: '/payments',
      icon: CurrencyDollarIcon,
      roles: ['admin', 'manager', 'finance'],
    },
    {
      name: 'CRM',
      path: '/crm',
      icon: ChatBubbleLeftRightIcon,
      roles: ['admin', 'manager', 'support'],
      subItems: [
        {
          name: 'Dashboard',
          path: '/crm/dashboard',
        },
        {
          name: 'Communications',
          path: '/crm/communications',
        },
        {
          name: 'Contacts',
          path: '/crm/contacts',
        },
        {
          name: 'Templates',
          path: '/crm/templates',
        },
        {
          name: 'Automation',
          path: '/crm/automation',
        },
      ],
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: ChartBarIcon,
      roles: ['admin', 'manager'],
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role)
  );

  const isActiveRoute = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <img
              className="h-8 w-auto"
              src="/assets/images/logo.svg"
              alt="Boosty Platform"
            />
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              
              return (
                <div key={item.name}>
                  <Link
                    to={item.path}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                  
                  {/* Sub-items for CRM */}
                  {hasSubItems && isActive && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = isActiveRoute(subItem.path);
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            className={`group flex items-center px-2 py-1 text-sm font-medium rounded-md transition-colors ${
                              isSubActive
                                ? 'bg-primary-100 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
              
              {/* User menu */}
              <div className="relative">
                <button
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                </button>
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md hover:bg-gray-100"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;