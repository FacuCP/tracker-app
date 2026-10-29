import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { DailyRoutineTaskStatus } from '../../../domain/dailyRoutine/usecases/GetDailyRoutineSession';
import { Checkbox } from '../../components/Checkbox';
import { EditButton } from '../../components/EditButton';
import { InfoButton } from '../../components/InfoButton';
import { InfoModal } from '../../components/InfoModal';

interface Props {
  item: DailyRoutineTaskStatus;
  first: boolean;
  /** Abre la edición (título + descripción) — la dispara el lápiz, no la fila. */
  onPress: () => void;
  onToggleDone: () => void;
  /** Mantener presionada: empieza (o agranda) la selección múltiple. */
  onLongPress: () => void;
  /** Si hay una selección activa, la fila muestra un checkbox de selección en vez del de hecho, y tocarla selecciona en vez de tildar. */
  selectionMode: boolean;
  selected: boolean;
  onToggleSelected: () => void;
}

/**
 * Fila de una tarea de rutina diaria: checkbox + título + descripción
 * recortada (como en listas). Tocar la fila la tilda/destilda (lo mismo que
 * el checkbox) — es la acción que más se usa acá, así que se le da toda la
 * fila; para editar título/descripción está el lápiz aparte. Si tiene
 * descripción, aparece además un botón "i" que la muestra completa en un
 * modal. Mantener presionada arranca una selección múltiple (para borrar
 * varias) — quien arma la pantalla se encarga del tacho/cancelar.
 */
export function DailyRoutineTaskRow({
  item,
  first,
  onPress,
  onToggleDone,
  onLongPress,
  selectionMode,
  selected,
  onToggleSelected,
}: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  const texts = (
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
  );

  const infoModal = item.task.description ? (
    <InfoModal
      visible={infoOpen}
      title={item.task.title}
      description={item.task.description}
      onClose={() => setInfoOpen(false)}
    />
  ) : null;

  if (selectionMode) {
    return (
      <TouchableOpacity
        style={[styles.row, !first && styles.border]}
        onPress={onToggleSelected}
        onLongPress={onLongPress}
        activeOpacity={0.6}
      >
        <Checkbox checked={selected} onToggle={onToggleSelected} />
        {texts}
        {infoModal}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.row, !first && styles.border]}>
      <TouchableOpacity style={styles.mainArea} onPress={onToggleDone} onLongPress={onLongPress} activeOpacity={0.6}>
        <Checkbox checked={item.done} onToggle={onToggleDone} />
        {texts}
      </TouchableOpacity>

      <EditButton onPress={onPress} style={styles.editButton} />

      {infoModal}
    </View>
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
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 2,
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
