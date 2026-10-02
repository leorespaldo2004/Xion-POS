import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  inputClassName = '',
  containerClassName = '',
  ...props
}) => {
  const customClass = inputClassName || className;
  return (
    <View className={`mb-3 ${containerClassName}`}>
      {label && <Text className="text-slate-700 text-xs font-bold mb-1.5">{label}</Text>}
      <TextInput
        placeholderTextColor="#94a3b8"
        className={`bg-slate-50 border border-slate-200 text-slate-900 px-4 py-3 rounded-2xl text-sm font-semibold ${
          error ? 'border-red-500' : 'focus:border-indigo-600'
        } ${customClass}`}
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
};
