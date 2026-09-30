import React from 'react';
import { Tabs } from 'expo-router';
import { ShoppingBag, Receipt, Package, Settings } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Caja POS',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Ventas',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventario',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
