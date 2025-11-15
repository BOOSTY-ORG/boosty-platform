import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, Link, useNavigate } from 'react-router-dom';

/**
 * Reusable Sidebar navigation component
 */
const Sidebar = ({
  isOpen = true,
  onToggle,
  menuItems = [],
  activeItem,
  onItemClick,
  logo,
  logoText,
  className = '',
  sidebarClassName = '',
  menuClassName = '',
  menuItemClassName = '',
  submenuClassName = '',
  collapsed = false,
  collapsible = true,
  showUser = false,
  user = null,
  onLogout,
  ...props
}) => {
  const [expandedItems, setExpandedItems] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleToggle = () => {
    if (collapsible && onToggle) {
      onToggle(!isOpen);
    }
  };
  
  const handleItemClick = (item) => {
    if (item.submenu && item.submenu.length > 0) {
      toggleSubmenu(item.id);
    } else {
      if (onItemClick) {
        onItemClick(item);
      }
      
      if (item.path) {
        navigate(item.path);
      }
    }
  };
  
  const toggleSubmenu = (itemId) => {
    setExpandedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };
  
  const isActive = (item) => {
    if (activeItem) {
      return activeItem === item.id;
    }
    
    if (item.path) {
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    }
    
    return false;
  };
  
  const isSubmenuActive = (submenu) => {
    return submenu.some(subItem => location.pathname === subItem.path || 
      (subItem.path && location.pathname.startsWith(subItem.path + '/')));
  };
  
  const renderMenuItem = (item, level = 0) => {
    const active = isActive(item);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const submenuActive = hasSubmenu && isSubmenuActive(item.submenu);
    
    return (
      <div key={item.id} className="mb-1">
        <button
          onClick={() => handleItemClick(item)}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            active || submenuActive
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          } ${collapsed && level === 0 ? 'justify-center' : ''} ${menuItemClassName}`}
          title={collapsed && level === 0 ? item.label : undefined}
        >
          <div className={`flex items-center ${collapsed && level === 0 ? 'justify-center' : ''}`}>
            {item.icon && (
              <span className={`${collapsed && level === 0 ? '' : 'mr-3'}`}>
                {item.icon}
              </span>
            )}
            {(!collapsed || level > 0) && (
              <span>{item.label}</span>
            )}
          </div>
          
          {hasSubmenu && !collapsed && (
            <svg
              className={`ml-2 h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
        
        {hasSubmenu && isExpanded && !collapsed && (
          <div className={`mt-1 ml-4 ${submenuClassName}`}>
            {item.submenu.map(subItem => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  const renderUserSection = () => {
    if (!showUser || !user) return null;
    
    return (
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {user.avatar ? (
              <img
                className="h-8 w-8 rounded-full"
                src={user.avatar}
                alt={user.name || 'User'}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {(user.name || 'User').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user.name || 'User'}</p>
              <p className="text-xs text-gray-500">{user.role || 'Admin'}</p>
            </div>
          )}
        </div>
        
        {!collapsed && onLogout && (
          <button
            onClick={onLogout}
            className="mt-3 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        )}
      </div>
    );
  };
  
  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarClassName} ${collapsed ? 'lg:w-16' : ''} ${className}`} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center">
          {logo && (
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          )}
          {!collapsed && logoText && (
            <span className="ml-2 text-lg font-semibold text-gray-900">
              {logoText}
            </span>
          )}
        </div>
        
        {collapsible && (
          <button
            onClick={handleToggle}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Navigation Menu */}
      <nav className={`flex-1 px-2 py-4 space-y-1 overflow-y-auto ${menuClassName}`}>
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
      
      {/* User Section */}
      {renderUserSection()}
    </div>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  onToggle: PropTypes.func,
  menuItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      path: PropTypes.string,
      icon: PropTypes.node,
      submenu: PropTypes.array,
    })
  ),
  activeItem: PropTypes.string,
  onItemClick: PropTypes.func,
  logo: PropTypes.string,
  logoText: PropTypes.string,
  className: PropTypes.string,
  sidebarClassName: PropTypes.string,
  menuClassName: PropTypes.string,
  menuItemClassName: PropTypes.string,
  submenuClassName: PropTypes.string,
  collapsed: PropTypes.bool,
  collapsible: PropTypes.bool,
  showUser: PropTypes.bool,
  user: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    avatar: PropTypes.string,
  }),
  onLogout: PropTypes.func,
};

/**
 * SidebarItem component for individual menu items
 */
const SidebarItem = ({
  item,
  active = false,
  collapsed = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors';
  
  const stateClasses = active
    ? 'bg-blue-100 text-blue-700'
    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${stateClasses} ${collapsed ? 'justify-center' : ''} ${className}`}
      title={collapsed ? item.label : undefined}
      {...props}
    >
      {item.icon && (
        <span className={`${collapsed ? '' : 'mr-3'}`}>
          {item.icon}
        </span>
      )}
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
};

SidebarItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    path: PropTypes.string,
    icon: PropTypes.node,
  }).isRequired,
  active: PropTypes.bool,
  collapsed: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};

Sidebar.Item = SidebarItem;

export default Sidebar;