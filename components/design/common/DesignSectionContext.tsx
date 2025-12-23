'use client';

import React, { createContext, useContext } from 'react';

const DesignSectionContext = createContext<string | null>(null);

export function DesignSectionProvider({ 
  activeSection, 
  children 
}: { 
  activeSection: string | null; 
  children: React.ReactNode;
}) {
  return (
    <DesignSectionContext.Provider value={activeSection}>
      {children}
    </DesignSectionContext.Provider>
  );
}

export function useDesignSection() {
  return useContext(DesignSectionContext);
}

