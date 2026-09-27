import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { GymSessionExercise } from '../../../domain/gym/entities/GymSession';

interface Props {
  item: GymSessionExercise;
  first: boolean;
  onPress: () => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
}

/**
 * Fila de un ejercicio en el detalle de la rutina: puesto, nombre, series x
 * repeticiones (+ peso), y cuántas series se llevan hechas con +/- para
 * sumar/restar sin entrar al ejercicio. Tocar la fila abre la edición.
 */
export function GymExerciseRow({ item, first, onPress, onAddSet, onRemoveSet }: Props) {
  const { exercise } = item;

  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.border]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <Text style={styles.position}>{exercise.position}</Text>

      <View style={styles.texts}>
        <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.info}>
          {exercise.sets} series × {exercise.reps != null ? `${exercise.reps} rep` : 'al fallo'}
          {exercise.weightKg > 0 ? ` · ${exercise.weightKg} kg` : ''}
        </Text>
      </View>

      <View style={styles.setsBox}>
        <TouchableOpacity
          style={[styles.setButton, item.completedSets === 0 && styles.setButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            onRemoveSet();
          }}
          disabled={item.completedSets === 0}
          hitSlop={6}
        >
          <Text style={styles.setButtonText}>−</Text>
        </TouchableOpacity>

        <Text style={[styles.setsValue, item.done && styles.setsValueDone]}>
          {item.completedSets}/{exercise.sets}
        </Text>

        <TouchableOpacity
          style={[styles.setButton, item.done && styles.setButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            onAddSet();
          }}
          disabled={item.done}
          hitSlop={6}
        >
          <Text style={styles.setButtonText}>＋</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  position: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textMuted,
    minWidth: 20,
    textAlign: 'right',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  info: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  setsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setButtonDisabled: {
    opacity: 0.35,
  },
  setButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  setsValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
  setsValueDone: {
    color: '#15803d',
  },
});
