'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { styles } from './styles';
import { useDesignSection } from './DesignSectionContext';

export function CollapsibleSection({ 
  title, 
  children, 
  defaultExpanded = false,
  id,
  resetKey
}: { 
  title: string; 
  children: React.ReactNode;
  defaultExpanded?: boolean;
  id?: string;
  resetKey?: string | number;
}) {
  const activeSection = useDesignSection();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const prevActiveSectionRef = useRef<string | null>(null);
  const ignoreDefaultExpandedRef = useRef<boolean>(false);
  const currentActiveSectionRef = useRef<string | null>(activeSection);
  
  // activeSectionが変わったときは常にfalseにリセット（カードがクリックされたとき）
  // useLayoutEffectを使って、defaultExpandedのuseEffectより先に実行されるようにする
  useLayoutEffect(() => {
    const sectionChanged = prevActiveSectionRef.current !== null && prevActiveSectionRef.current !== activeSection;
    if (sectionChanged) {
      setIsExpanded(false);
      ignoreDefaultExpandedRef.current = true;
      currentActiveSectionRef.current = activeSection;
    } else {
      // activeSectionが変わっていない場合は、フラグをリセット
      ignoreDefaultExpandedRef.current = false;
      currentActiveSectionRef.current = activeSection;
    }
    prevActiveSectionRef.current = activeSection;
  }, [activeSection]);
  
  // defaultExpandedが変わったとき、またはresetKeyが変わったときに状態をリセット
  // activeSectionが変わった直後は実行しない
  useEffect(() => {
    // activeSectionが変わっていない場合のみ実行
    if (!ignoreDefaultExpandedRef.current && currentActiveSectionRef.current === activeSection) {
      setIsExpanded(defaultExpanded);
    }
  }, [defaultExpanded, resetKey, activeSection]);
  
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
