import { StyleSheet, Text, View } from 'react-native';

import { capitalize, formatChatDay } from '../../../core/utils/date';
import { theme } from '../../../core/theme';

interface Props {
  date: Date;
}

/** Separador de día en el chat de una anotación: "Hoy", "Ayer", etc. */
export function NoteDaySeparator({ date }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Text style={styles.text}>{capitalize(formatChatDay(date))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  pill: {
    backgroundColor: theme.colors.border,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
