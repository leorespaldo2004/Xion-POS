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
  let bgStyles = 'bg-indigo-600 active:bg-indigo-700';
  let textStyles = 'text-white font-semibold';

  if (variant === 'secondary') {
    bgStyles = 'bg-gray-800 active:bg-gray-700 border border-gray-700';
    textStyles = 'text-gray-200 font-medium';
  } else if (variant === 'outline') {
    bgStyles = 'bg-transparent border border-indigo-500 active:bg-indigo-950';
    textStyles = 'text-indigo-400 font-medium';
  } else if (variant === 'ghost') {
    bgStyles = 'bg-transparent active:bg-gray-800';
    textStyles = 'text-gray-300 font-medium';
  } else if (variant === 'destructive') {
    bgStyles = 'bg-red-600 active:bg-red-700';
    textStyles = 'text-white font-semibold';
  } else if (variant === 'success') {
    bgStyles = 'bg-emerald-600 active:bg-emerald-700';
    textStyles = 'text-white font-semibold';
  }

  let sizeStyles = 'py-3 px-4 rounded-xl';
  let textSizeStyles = 'text-base';

  if (size === 'sm') {
    sizeStyles = 'py-2 px-3 rounded-lg';
    textSizeStyles = 'text-sm';
  } else if (size === 'lg') {
    sizeStyles = 'py-4 px-6 rounded-2xl';
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
