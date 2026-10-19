import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { DailyRoutineTaskStatus } from '../../../domain/dailyRoutine/usecases/GetDailyRoutineSession';
import { InfoButton } from '../../components/InfoButton';
import { InfoModal } from '../../components/InfoModal';
import { Checkbox } from '../../components/Checkbox';

interface Props {
  item: DailyRoutineTaskStatus;
  first: boolean;
  onPress: () => void;
  onToggleDone: () => void;
}

/**
 * Fila de una tarea de rutina diaria: checkbox + título + descripción
 * recortada (como en listas). Tocar la fila la edita; si tiene descripción,
 * aparece además un botón "i" que la muestra completa en un modal.
 */
export function DailyRoutineTaskRow({ item, first, onPress, onToggleDone }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <TouchableOpacity style={[styles.row, !first && styles.border]} onPress={onPress} activeOpacity={0.6}>
      <Checkbox checked={item.done} onToggle={onToggleDone} />

      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, item.done && styles.titleDone]} numberOfLines={1}>
            {item.task.title}
          </Text>
          {item.task.description ? <InfoButton onPress={() => setInfoOpen(true)} /> : null}
        </View>
        {item.task.description ? (
          <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
            {item.task.description}
          </Text>
        ) : null}
      </View>

      {item.task.description ? (
        <InfoModal
          visible={infoOpen}
          title={item.task.title}
          description={item.task.description}
          onClose={() => setInfoOpen(false)}
        />
      ) : null}
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
  texts: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
