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
    <View className="bg-white border-b border-slate-100 px-4 pt-12 pb-3 flex-row items-center justify-between shadow-sm z-10">
      <View className="flex-row items-center gap-2.5">
        <View className="w-9 h-9 rounded-2xl bg-indigo-900 items-center justify-center shadow-sm">
          <Text className="text-white font-black text-base">X</Text>
        </View>
        <View>
          <Text className="text-slate-900 font-extrabold text-lg leading-tight">{title}</Text>
          <Text className="text-slate-400 text-xs font-semibold">{user?.name || 'Cajero'}</Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3">
        {/* Network & Sync indicator */}
        <Pressable
          onPress={() => triggerSync()}
          disabled={isSyncing}
          className="flex-row items-center gap-1.5 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200"
        >
          {isSyncing ? (
            <RefreshCw size={14} color="#4f46e5" className="animate-spin" />
          ) : isOnline ? (
            <Wifi size={14} color="#059669" />
          ) : (
            <WifiOff size={14} color="#dc2626" />
          )}

          <Text className={`text-xs font-extrabold ${isOnline ? 'text-emerald-700' : 'text-red-600'}`}>
            {isOnline ? 'En línea' : 'Sin red'}
          </Text>

          {pendingCount > 0 && (
            <View className="bg-amber-500 rounded-full px-2 py-0.5 ml-0.5">
              <Text className="text-black font-black text-[10px]">{pendingCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
};
