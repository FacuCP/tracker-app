import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  onPress: () => void;
  /** Lado del círculo en px (por defecto 18). */
  size?: number;
}

/** Botón circular "i" que abre el `InfoModal` con la descripción de algo. */
export function InfoButton({ onPress, size = 18 }: Props) {
  return (
    <TouchableOpacity
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      hitSlop={8}
    >
      <Text style={[styles.text, { fontSize: size * 0.6 }]}>i</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    fontStyle: 'italic',
    color: theme.colors.accent,
  },
});
