import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Loading component with various styles and sizes
 */
const Loading = ({
  type = 'spinner',
  size = 'md',
  text,
  overlay = false,
  className = '',
  color = 'blue',
  ...props
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
    purple: 'border-purple-600',
    white: 'border-white',
  };
  
  const renderSpinner = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
  
  const renderDots = () => {
    const dotSizeClasses = {
      xs: 'h-1 w-1',
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4',
    };
    
    return (
      <div className={`flex space-x-1 ${className}`} {...props}>
        <div className={`${dotSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`}></div>
        <div className={`${dotSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
        <div className={`${dotSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.4s' }}></div>
      </div>
    );
  };
  
  const renderPulse = () => (
    <div className={`flex space-x-2 ${className}`} {...props}>
      <div className={`${sizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`}></div>
      <div className={`${sizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
      <div className={`${sizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
  
  const renderSkeleton = () => {
    const skeletonSizeClasses = {
      xs: 'h-4',
      sm: 'h-6',
      md: 'h-8',
      lg: 'h-12',
      xl: 'h-16',
    };
    
    return (
      <div className={`animate-pulse ${className}`} {...props}>
        <div className={`${skeletonSizeClasses[size]} bg-gray-300 rounded`}></div>
      </div>
    );
  };
  
  const renderBars = () => {
    const barSizeClasses = {
      xs: 'h-4 w-0.5',
      sm: 'h-6 w-1',
      md: 'h-8 w-1',
      lg: 'h-12 w-1.5',
      xl: 'h-16 w-2',
    };
    
    return (
      <div className={`flex space-x-1 ${className}`} {...props}>
        <div className={`${barSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`}></div>
        <div className={`${barSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.1s' }}></div>
        <div className={`${barSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.2s' }}></div>
        <div className={`${barSizeClasses[size]} ${colorClasses[color].replace('border-', 'bg-')} rounded-full animate-pulse`} style={{ animationDelay: '0.3s' }}></div>
      </div>
    );
  };
  
  const renderLoadingType = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      case 'bars':
        return renderBars();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };
  
  const loadingElement = (
    <div className="flex flex-col items-center justify-center">
      {renderLoadingType()}
      {text && (
        <p className={`mt-2 text-sm ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>
          {text}
        </p>
      )}
    </div>
  );
  
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-4">
          {loadingElement}
        </div>
      </div>
    );
  }
  
  return loadingElement;
};

Loading.propTypes = {
  type: PropTypes.oneOf(['spinner', 'dots', 'pulse', 'skeleton', 'bars']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  text: PropTypes.string,
  overlay: PropTypes.bool,
  className: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'gray', 'green', 'red', 'yellow', 'purple', 'white']),
};

/**
 * PageLoading component for full-page loading states
 */
const PageLoading = ({
  text = 'Loading...',
  className = '',
  ...props
}) => (
  <div className={`flex flex-col items-center justify-center min-h-screen ${className}`} {...props}>
    <Loading type="spinner" size="xl" text={text} />
  </div>
);

PageLoading.propTypes = {
  text: PropTypes.string,
  className: PropTypes.string,
};

/**
 * InlineLoading component for inline loading states
 */
const InlineLoading = ({
  text,
  size = 'sm',
  className = '',
  ...props
}) => (
  <div className={`flex items-center space-x-2 ${className}`} {...props}>
    <Loading type="spinner" size={size} />
    {text && <span className="text-sm text-gray-600">{text}</span>}
  </div>
);

InlineLoading.propTypes = {
  text: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  className: PropTypes.string,
};

Loading.Page = PageLoading;
Loading.Inline = InlineLoading;

export default Loading;