import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function SimulatorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>شاشة محاكي الاستثمار - قيد التطوير</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
