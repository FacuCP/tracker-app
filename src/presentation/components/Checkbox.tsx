import { Check } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

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
      {checked ? <Check size={size * 0.7} color="#fff" strokeWidth={3} /> : <View />}
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
});
