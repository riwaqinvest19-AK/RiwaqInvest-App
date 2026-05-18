import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const BRAND_NAVY = '#154375';

function TabBarIconFA(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

function TabBarIconIon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND_NAVY,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E8ECF0',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('screens.homeTitle'),
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconIon name={focused ? 'business' : 'business-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: t('screens.propertiesTitle'),
          tabBarLabel: t('tabs.properties'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconIon name={focused ? 'location' : 'location-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: t('screens.portfolioTitle'),
          tabBarLabel: t('tabs.portfolio'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconIon name={focused ? 'pie-chart' : 'pie-chart-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="simulator"
        options={{
          title: t('screens.simulatorTitle'),
          tabBarLabel: t('tabs.simulator'),
          tabBarIcon: ({ color }) => <TabBarIconFA name="line-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('screens.profileTitle'),
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconIon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate('/(tabs)/profile' as Href);
          },
        }}
      />
    </Tabs>
  );
}
