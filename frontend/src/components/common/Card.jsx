import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Card component with header, body, and footer sections
 */
const Card = ({
  children,
  title,
  subtitle,
  image,
  imageAlt,
  actions,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  imageClassName = '',
  titleClassName = '',
  subtitleClassName = '',
  padding = 'normal',
  shadow = 'normal',
  border = true,
  rounded = true,
  hover = false,
  onClick,
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    normal: 'p-6',
    lg: 'p-8',
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    normal: 'shadow',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };
  
  const borderClasses = border ? 'border border-gray-200' : '';
  const roundedClasses = rounded ? 'rounded-lg' : '';
  const hoverClasses = hover ? 'transition-shadow duration-300 hover:shadow-lg' : '';
  
  const cardClasses = [
    'bg-white',
    paddingClasses[padding],
    shadowClasses[shadow],
    borderClasses,
    roundedClasses,
    hoverClasses,
    onClick ? 'cursor-pointer' : '',
    className,
  ].filter(Boolean).join(' ');
  
  const renderHeader = () => {
    if (!title && !subtitle && !image) return null;
    
    return (
      <div className={`mb-4 ${headerClassName}`}>
        {image && (
          <img
            src={image}
            alt={imageAlt || title || 'Card image'}
            className={`w-full h-48 object-cover rounded-t-lg ${imageClassName}`}
          />
        )}
        {(title || subtitle) && (
          <div className="px-6 py-4">
            {title && (
              <h3 className={`text-lg font-medium text-gray-900 ${titleClassName}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`mt-1 text-sm text-gray-500 ${subtitleClassName}`}>
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const renderFooter = () => {
    if (!actions) return null;
    
    return (
      <div className={`mt-4 pt-4 border-t border-gray-200 ${footerClassName}`}>
        {actions}
      </div>
    );
  };
  
  return (
    <div
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {renderHeader()}
      <div className={bodyClassName}>
        {children}
      </div>
      {renderFooter()}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  image: PropTypes.string,
  imageAlt: PropTypes.string,
  actions: PropTypes.node,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
  headerClassName: PropTypes.string,
  footerClassName: PropTypes.string,
  imageClassName: PropTypes.string,
  titleClassName: PropTypes.string,
  subtitleClassName: PropTypes.string,
  padding: PropTypes.oneOf(['none', 'sm', 'normal', 'lg']),
  shadow: PropTypes.oneOf(['none', 'sm', 'normal', 'lg', 'xl']),
  border: PropTypes.bool,
  rounded: PropTypes.bool,
  hover: PropTypes.bool,
  onClick: PropTypes.func,
};

/**
 * Card Header component for use within Card
 */
const CardHeader = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

CardHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Card Body component for use within Card
 */
const CardBody = ({
  children,
  className = '',
  padding = 'normal',
  ...props
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    normal: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div className={`${paddingClasses[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};

CardBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padding: PropTypes.oneOf(['none', 'sm', 'normal', 'lg']),
};

/**
 * Card Footer component for use within Card
 */
const CardFooter = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`px-6 py-4 border-t border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

CardFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

/**
 * Metrics Card component for displaying dashboard metrics
 */
const MetricsCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
  ...props
}) => {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  };
  
  return (
    <Card
      className={`hover:shadow-md transition-shadow ${className}`}
      padding="normal"
      {...props}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon && (
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              {icon}
            </div>
          )}
        </div>
        <div className="ml-4 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd>
              <div className="text-lg font-medium text-gray-900">
                {value}
              </div>
              {change && (
                <div className={`flex items-center text-sm ${changeColors[changeType]}`}>
                  {changeType === 'positive' && (
                    <svg className="self-center flex-shrink-0 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {changeType === 'negative' && (
                    <svg className="self-center flex-shrink-0 h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="ml-1">{change}</span>
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </Card>
  );
};

MetricsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.string,
  changeType: PropTypes.oneOf(['positive', 'negative', 'neutral']),
  icon: PropTypes.node,
  className: PropTypes.string,
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Metrics = MetricsCard;

export default Card;