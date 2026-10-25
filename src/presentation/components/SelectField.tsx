import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../core/theme';

export interface SelectOption<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}

/** Combo box: muestra la opción elegida y abre una lista para cambiarla. */
export function SelectField<T extends string>({ value, options, onChange, label }: Props<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.key === value);

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.valueRow}>
          <Text style={styles.value} numberOfLines={1}>
            {selected?.label ?? ''}
          </Text>
          <ChevronDown size={16} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {options.map((option) => {
              const isSelected = option.key === value;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={styles.option}
                  activeOpacity={0.6}
                  onPress={() => {
                    onChange(option.key);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  value: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingVertical: 8,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  optionTextSelected: {
    color: theme.colors.accent,
  },
});
