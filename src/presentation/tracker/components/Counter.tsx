import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  value: number;
  onChange: (next: number) => void;
  /** Valor mínimo (por defecto 0: un contador no baja de cero). */
  min?: number;
  disabled?: boolean;
}

/** Contador con botones − / + para trackers de tipo número. */
export function Counter({ value, onChange, min = 0, disabled = false }: Props) {
  const canDecrement = !disabled && value > min;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
        onPress={() => onChange(value - 1)}
        disabled={!canDecrement}
        activeOpacity={0.7}
      >
        <Text style={styles.sign}>−</Text>
      </TouchableOpacity>

      <Text style={styles.value}>{value}</Text>

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => onChange(value + 1)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.sign}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  sign: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    minWidth: 44,
    textAlign: 'center',
  },
});
