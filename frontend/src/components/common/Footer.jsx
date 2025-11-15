import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Footer component with customizable content
 */
const Footer = ({
  companyName = 'Boosty Platform',
  copyrightText,
  links = [],
  socialLinks = [],
  showYear = true,
  className = '',
  contentClassName = '',
  variant = 'default',
  ...props
}) => {
  const currentYear = new Date().getFullYear();
  const defaultCopyrightText = `© ${showYear ? currentYear : ''} ${companyName}. All rights reserved.`;
  
  const renderDefaultFooter = () => (
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm text-gray-500">
            {copyrightText || defaultCopyrightText}
          </p>
        </div>
        
        {links.length > 0 && (
          <div className="flex space-x-6">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  const renderExtendedFooter = () => (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
            About {companyName}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Leading the way in solar energy solutions, making renewable energy accessible to everyone.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex space-x-6">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="text-gray-400 hover:text-gray-500"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          )}
        </div>
        
        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div>
          <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
            Legal
          </h3>
          <ul className="space-y-2">
            <li>
              <a href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" className="text-sm text-gray-500 hover:text-gray-700">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="/cookies" className="text-sm text-gray-500 hover:text-gray-700">
                Cookie Policy
              </a>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          {copyrightText || defaultCopyrightText}
        </p>
      </div>
    </div>
  );
  
  const renderMinimalFooter = () => (
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-center">
        <p className="text-sm text-gray-500">
          {copyrightText || defaultCopyrightText}
        </p>
      </div>
    </div>
  );
  
  const renderFooterContent = () => {
    switch (variant) {
      case 'extended':
        return renderExtendedFooter();
      case 'minimal':
        return renderMinimalFooter();
      case 'default':
      default:
        return renderDefaultFooter();
    }
  };
  
  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`} {...props}>
      {renderFooterContent()}
    </footer>
  );
};

Footer.propTypes = {
  companyName: PropTypes.string,
  copyrightText: PropTypes.string,
  links: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
    })
  ),
  socialLinks: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
    })
  ),
  showYear: PropTypes.bool,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'extended', 'minimal']),
};

/**
 * SimpleFooter component for basic footer needs
 */
const SimpleFooter = ({
  companyName = 'Boosty Platform',
  className = '',
  ...props
}) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`} {...props}>
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <p className="text-sm text-gray-500">
            © {currentYear} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

SimpleFooter.propTypes = {
  companyName: PropTypes.string,
  className: PropTypes.string,
};

/**
 * AdminFooter component for admin dashboard
 */
const AdminFooter = ({
  version = '1.0.0',
  className = '',
  ...props
}) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className}`} {...props}>
      <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <p className="text-xs text-gray-500">
            © {currentYear} Boosty Platform. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-1 sm:mt-0">
            Version {version}
          </p>
        </div>
      </div>
    </footer>
  );
};

AdminFooter.propTypes = {
  version: PropTypes.string,
  className: PropTypes.string,
};

Footer.Simple = SimpleFooter;
Footer.Admin = AdminFooter;

export default Footer;