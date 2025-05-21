// Breadcrumb.jsx
import React from 'react';
import './Breadcrumb.css';

export const BreadcrumbItem = ({ children, href, active = false, className = '' }) => {
  const Component = href ? 'a' : 'span';

  return (
    <li className={`breadcrumb-item ${active ? 'breadcrumb-active' : ''} ${className}`}>
      <Component href={href}>{children}</Component>
    </li>
  );
};

export const Breadcrumb = ({ children, separator = '/', className = '' }) => {
  // Clone children to add separator
  const items = React.Children.map(children, (child, index) => {
    if (index === React.Children.count(children) - 1) {
      return child;
    }
    return (
      <>
        {child}
        <span className="breadcrumb-separator">{separator}</span>
      </>
    );
  });

  return (
    <nav aria-label="breadcrumb">
      <ol className={`breadcrumb ${className}`}>{items}</ol>
    </nav>
  );
};