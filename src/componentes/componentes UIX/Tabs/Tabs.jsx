import React, { useState } from 'react';
import './Tabs.css';

export const Tabs = ({ 
  tabs, 
  defaultTab = 0,
  onChange,
  className = '',
  variant = 'default'
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (index) => {
    setActiveTab(index);
    if (onChange) {
      onChange(index);
    }
  };

  return (
    <div className={`tabs tabs-${variant} ${className}`}>
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => handleTabClick(index)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );
};