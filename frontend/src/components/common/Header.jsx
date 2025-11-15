import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Header component with navigation and user actions
 */
const Header = ({
  title,
  subtitle,
  user,
  onMenuToggle,
  onLogout,
  showMenuButton = true,
  showUserMenu = true,
  showSearch = false,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search...',
  actions = [],
  className = '',
  logo,
  logoText,
  breadcrumbs = [],
  ...props
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  const handleSearchToggle = () => {
    setSearchOpen(!searchOpen);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(searchValue);
    }
  };
  
  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`} {...props}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center">
            {showMenuButton && (
              <button
                onClick={onMenuToggle}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            {logo && (
              <img src={logo} alt="Logo" className="h-8 w-auto mr-4" />
            )}
            
            <div>
              {title && (
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
              
              {breadcrumbs.length > 0 && (
                <nav className="flex mt-1" aria-label="Breadcrumb">
                  <ol className="flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index} className="flex items-center">
                        {index > 0 && (
                          <svg
                            className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {crumb.href ? (
                          <a
                            href={crumb.href}
                            className="font-medium text-gray-500 hover:text-gray-700"
                          >
                            {crumb.label}
                          </a>
                        ) : (
                          <span
                            className={`font-medium ${
                              index === breadcrumbs.length - 1
                                ? 'text-gray-900'
                                : 'text-gray-500'
                            }`}
                          >
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            {showSearch && (
              <div className="relative">
                {searchOpen ? (
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={handleSearchToggle}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={handleSearchToggle}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  >
                    <span className="sr-only">Search</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            
            {/* Actions */}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                title={action.label}
              >
                {action.icon}
              </button>
            ))}
            
            {/* User menu */}
            {showUserMenu && user && (
              <div className="relative">
                <button
                  onClick={handleUserMenuToggle}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Open user menu</span>
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
                </button>
                
                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                        <p className="text-xs text-gray-500">{user.email || 'user@example.com'}</p>
                        {user.role && (
                          <p className="text-xs text-gray-500 mt-1">{user.role}</p>
                        )}
                      </div>
                      
                      {user.menuItems && user.menuItems.length > 0 && (
                        <>
                          {user.menuItems.map((item, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                item.onClick && item.onClick();
                                setUserMenuOpen(false);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              {item.label}
                            </button>
                          ))}
                        </>
                      )}
                      
                      {onLogout && (
                        <button
                          onClick={() => {
                            onLogout();
                            setUserMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
    avatar: PropTypes.string,
    menuItems: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        onClick: PropTypes.func,
      })
    ),
  }),
  onMenuToggle: PropTypes.func,
  onLogout: PropTypes.func,
  showMenuButton: PropTypes.bool,
  showUserMenu: PropTypes.bool,
  showSearch: PropTypes.bool,
  searchValue: PropTypes.string,
  onSearchChange: PropTypes.func,
  onSearchSubmit: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      icon: PropTypes.node,
      onClick: PropTypes.func,
    })
  ),
  className: PropTypes.string,
  logo: PropTypes.string,
  logoText: PropTypes.string,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      href: PropTypes.string,
    })
  ),
};

/**
 * SimpleHeader component for basic header needs
 */
const SimpleHeader = ({
  title,
  subtitle,
  className = '',
  ...props
}) => (
  <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`} {...props}>
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div>
        {title && (
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        )}
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  </header>
);

SimpleHeader.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  className: PropTypes.string,
};

Header.Simple = SimpleHeader;

export default Header;