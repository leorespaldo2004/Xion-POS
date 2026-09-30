import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && <Text className="text-gray-300 text-sm font-medium mb-1.5">{label}</Text>}
      <TextInput
        placeholderTextColor="#6b7280"
        className={`bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl text-base font-normal ${
          error ? 'border-red-500' : 'focus:border-indigo-500'
        } ${className}`}
        {...props}
      />
      {error && <Text className="text-red-400 text-xs mt-1">{error}</Text>}
    </View>
  );
};
