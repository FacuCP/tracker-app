import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
  /** Tamaño del cuadrado (por defecto 22). */
  size?: number;
  style?: ViewStyle;
}

/** Checkbox cuadrado con tilde. */
export function Checkbox({ checked, onToggle, size = 22, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      hitSlop={8}
      activeOpacity={0.7}
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size / 5 },
        checked && styles.boxChecked,
        style,
      ]}
    >
      {checked ? (
        <Text style={[styles.tick, { fontSize: size * 0.7 }]}>✓</Text>
      ) : (
        <View />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tick: {
    color: '#fff',
    fontWeight: '900',
  },
});
