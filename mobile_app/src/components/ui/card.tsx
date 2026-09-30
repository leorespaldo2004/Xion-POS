import React from 'react';
import { View, ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <View
      className={`bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-lg ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
