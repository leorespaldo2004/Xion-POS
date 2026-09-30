import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { useSync } from '../../hooks/useSync';
import { useAuthStore } from '../../stores/auth-store';

export interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();
  const user = useAuthStore((s) => s.user);

  return (
    <View className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className="w-8 h-8 rounded-lg bg-indigo-600 items-center justify-center">
          <Text className="text-white font-bold text-base">X</Text>
        </View>
        <View>
          <Text className="text-white font-bold text-lg leading-tight">{title}</Text>
          <Text className="text-gray-400 text-xs">{user?.name || 'Cajero'}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        {/* Network & Sync indicator */}
        <Pressable
          onPress={() => triggerSync()}
          disabled={isSyncing}
          className="flex-row items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700"
        >
          {isSyncing ? (
            <RefreshCw size={14} color="#6366f1" className="animate-spin" />
          ) : isOnline ? (
            <Wifi size={14} color="#10b981" />
          ) : (
            <WifiOff size={14} color="#ef4444" />
          )}

          <Text className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
            {isOnline ? 'En línea' : 'Sin red'}
          </Text>

          {pendingCount > 0 && (
            <View className="bg-amber-500 rounded-full px-1.5 py-0.2">
              <Text className="text-black font-bold text-xs">{pendingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
};
