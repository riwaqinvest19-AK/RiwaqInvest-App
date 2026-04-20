import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIconFA(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={26} style={{ marginBottom: -2 }} {...props} />;
}

function TabBarIconIon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={26} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('screens.homeTitle'),
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabBarIconIon name="home-outline" color={color} />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginEnd: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="properties"
        options={{
          title: t('screens.propertiesTitle'),
          tabBarLabel: t('tabs.properties'),
          tabBarIcon: ({ color }) => <TabBarIconIon name="business-outline" color={color} />,
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
        name="portfolio"
        options={{
          title: t('screens.portfolioTitle'),
          tabBarLabel: t('tabs.portfolio'),
          tabBarIcon: ({ color }) => <TabBarIconFA name="briefcase" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('screens.profileTitle'),
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color }) => <TabBarIconIon name="person-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
