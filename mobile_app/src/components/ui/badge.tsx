import React from 'react';
import { View, Text } from 'react-native';

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', className = '' }) => {
  let bg = 'bg-slate-100 border-slate-200 text-slate-700';
  if (variant === 'success') bg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  if (variant === 'warning') bg = 'bg-amber-50 border-amber-200 text-amber-800';
  if (variant === 'destructive') bg = 'bg-red-50 border-red-200 text-red-700';
  if (variant === 'info') bg = 'bg-indigo-50 border-indigo-200 text-indigo-900';

  return (
    <View className={`px-3 py-1 rounded-full border ${bg} ${className}`}>
      <Text className={`text-xs font-extrabold ${bg.split(' ').pop()}`}>{label}</Text>
    </View>
  );
};
