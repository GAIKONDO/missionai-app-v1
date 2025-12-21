import React from 'react';

export interface DesignCardProps {
  id: string;
  title: string;
  description?: string;
  isActive?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

