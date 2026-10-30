import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { DailyRoutineTaskStatus } from '../../../domain/dailyRoutine/usecases/GetDailyRoutineSession';
import { Checkbox } from '../../components/Checkbox';
import { FavoriteStar } from '../../components/FavoriteStar';

/** A partir de esta cantidad de tareas, la lista scrollea en vez de crecer sin límite (igual que `ListCard` en Favoritos). */
const MAX_VISIBLE_TASKS = 8;

interface Props {
  tasks: DailyRoutineTaskStatus[];
  doneCount: number;
  total: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  onToggleTask: (item: DailyRoutineTaskStatus) => void;
  onOpen: () => void;
}

function renderTaskRow(item: DailyRoutineTaskStatus, onToggleTask: (item: DailyRoutineTaskStatus) => void) {
  return (
    <TouchableOpacity
      key={item.task.id}
      style={styles.taskRow}
      onPress={() => onToggleTask(item)}
      activeOpacity={0.6}
    >
      <Checkbox checked={item.done} onToggle={() => onToggleTask(item)} />
      <Text style={[styles.taskTitle, item.done && styles.taskTitleDone]} numberOfLines={1}>
        {item.task.title}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Card de "Rutina diaria" en Favoritos: un indicador de cuánto se completó y,
 * desplegada (por defecto lo está — mismo triángulo que `ListCard`, al lado
 * de la estrella), la lista de tareas de hoy (se tildan sin salir de
 * Favoritos). Colapsada muestra solo el progreso. Reemplaza al tracker
 * "Seguimiento de Rutina" que antes aparecía acá — ese tracker ahora es de
 * uso interno nomás (solo se ve en la pantalla de Rutina diaria, para el
 * calendario de seguimiento).
 */
export function DailyRoutineSummaryCard({
  tasks,
  doneCount,
  total,
  favorite,
  onToggleFavorite,
  onToggleTask,
  onOpen,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Rutina diaria</Text>
        <View style={styles.headerActions}>
          <FavoriteStar favorite={favorite} onToggle={onToggleFavorite} />
          {total > 0 ? (
            <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
              <Text style={styles.expandTriangle}>{expanded ? '▾' : '▸'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {total === 0 ? (
        <Text style={styles.emptyText}>Todavía no hiciste una lista de tareas diarias.</Text>
      ) : (
        <>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {doneCount}/{total}
            </Text>
          </View>

          {expanded ? (
            tasks.length > MAX_VISIBLE_TASKS ? (
              <ScrollView
                style={styles.tasksScroll}
                contentContainerStyle={styles.tasksScrollContent}
                nestedScrollEnabled
                persistentScrollbar
                showsVerticalScrollIndicator
              >
                {tasks.map((item) => renderTaskRow(item, onToggleTask))}
              </ScrollView>
            ) : (
              <View style={styles.tasks}>{tasks.map((item) => renderTaskRow(item, onToggleTask))}</View>
            )
          ) : null}
        </>
      )}

      <TouchableOpacity style={styles.openButton} onPress={onOpen}>
        <Text style={styles.openText}>Ver rutina diaria →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandTriangle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  tasks: {
    gap: 10,
  },
  tasksScroll: {
    maxHeight: 280,
  },
  tasksScrollContent: {
    gap: 10,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  openButton: {
    alignSelf: 'flex-start',
  },
  openText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
