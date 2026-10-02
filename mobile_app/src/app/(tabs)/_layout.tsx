import React from 'react';
import { Tabs } from 'expo-router';
import { Wallet, ShoppingCart, BarChart3, Settings, ShoppingBag } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 5
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Caja',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Ventas',
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Compras',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={22} />
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          href: null // hidden tab
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          href: null // hidden tab
        }}
      />
      <Tabs.Screen
        name="payment-methods"
        options={{
          href: null // hidden tab
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          href: null // hidden tab
        }}
      />
    </Tabs>
  );
}

