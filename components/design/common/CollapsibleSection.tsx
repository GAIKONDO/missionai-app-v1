'use client';

import React, { useState } from 'react';
import { styles } from './styles';

export function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false,
  id 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultExpanded?: boolean;
  id?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div style={styles.section} id={id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border-color)',
          marginBottom: isExpanded ? '16px' : '0',
          transition: 'all 0.2s',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-background)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-surface)';
        }}
      >
        <h3 style={{ ...styles.sectionTitle, margin: 0, fontSize: '18px' }}>
          {title}
        </h3>
        <span style={{ 
          fontSize: '20px', 
          color: 'var(--color-text-secondary)',
          transition: 'transform 0.2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          ▼
        </span>
      </div>
      <div style={{
        maxHeight: isExpanded ? '10000px' : '0',
        overflow: 'hidden',
        opacity: isExpanded ? 1 : 0,
        transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
      }}>
        {isExpanded && children}
      </div>
    </div>
  );
}
