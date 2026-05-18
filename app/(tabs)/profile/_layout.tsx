import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="security" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="verification" />
      <Stack.Screen name="admin-verification" />
      <Stack.Screen name="add-project" />
      <Stack.Screen name="edit-project/[id]" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="support" />
    </Stack>
  );
}
