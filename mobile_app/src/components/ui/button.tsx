import React from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

export interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  textClassName = '',
  disabled,
  ...props
}) => {
  let bgStyles = 'bg-indigo-900 active:bg-indigo-950 shadow-sm';
  let textStyles = 'text-white font-extrabold';

  if (variant === 'secondary') {
    bgStyles = 'bg-slate-100 active:bg-slate-200 border border-slate-200';
    textStyles = 'text-slate-800 font-bold';
  } else if (variant === 'outline') {
    bgStyles = 'bg-transparent border border-indigo-200 active:bg-indigo-50';
    textStyles = 'text-indigo-900 font-extrabold';
  } else if (variant === 'ghost') {
    bgStyles = 'bg-transparent active:bg-slate-100';
    textStyles = 'text-slate-600 font-bold';
  } else if (variant === 'destructive') {
    bgStyles = 'bg-red-600 active:bg-red-700 shadow-sm';
    textStyles = 'text-white font-extrabold';
  } else if (variant === 'success') {
    bgStyles = 'bg-emerald-600 active:bg-emerald-700 shadow-sm';
    textStyles = 'text-white font-extrabold';
  }

  let sizeStyles = 'py-3.5 px-5 rounded-full min-h-[48px]';
  let textSizeStyles = 'text-base';

  if (size === 'sm') {
    sizeStyles = 'py-2 px-3.5 rounded-full min-h-[38px]';
    textSizeStyles = 'text-xs';
  } else if (size === 'lg') {
    sizeStyles = 'py-4 px-6 rounded-full min-h-[54px]';
    textSizeStyles = 'text-lg';
  }

  if (disabled || loading) {
    bgStyles += ' opacity-50';
  }

  return (
    <Pressable
      disabled={disabled || loading}
      className={`flex-row items-center justify-center ${sizeStyles} ${bgStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : typeof children === 'string' ? (
        <Text className={`${textSizeStyles} ${textStyles} ${textClassName}`}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};
