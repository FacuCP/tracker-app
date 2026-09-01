import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../../core/theme';

interface Props {
  title: string;
  description: string;
}

/** Pantalla placeholder para features que todavía no están implementadas. */
export function ComingSoon({ title, description }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.badge}>Función futura</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  badge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
