import React from 'react';
import { View, ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <View
      className={`bg-white border border-slate-100 rounded-3xl p-4 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
