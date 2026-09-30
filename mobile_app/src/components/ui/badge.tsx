import React from 'react';
import { View, Text } from 'react-native';

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', className = '' }) => {
  let bg = 'bg-gray-800 border-gray-700 text-gray-300';
  if (variant === 'success') bg = 'bg-emerald-950/80 border-emerald-800 text-emerald-400';
  if (variant === 'warning') bg = 'bg-amber-950/80 border-amber-800 text-amber-400';
  if (variant === 'destructive') bg = 'bg-red-950/80 border-red-800 text-red-400';
  if (variant === 'info') bg = 'bg-indigo-950/80 border-indigo-800 text-indigo-400';

  return (
    <View className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${bg} ${className}`}>
      <Text className={`text-xs font-semibold ${bg.split(' ').pop()}`}>{label}</Text>
    </View>
  );
};
