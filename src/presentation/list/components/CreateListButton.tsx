import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { theme } from '../../../core/theme';

interface Props {
  onPress: () => void;
}

/** Botón para crear una lista nueva. */
export function CreateListButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.text}>＋ Crear lista nueva</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
});
