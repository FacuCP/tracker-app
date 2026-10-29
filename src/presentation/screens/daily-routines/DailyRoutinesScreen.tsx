import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { FavoriteStar } from '../../components/FavoriteStar';
import { ReorderRow } from '../../components/ReorderRow';
import { DailyRoutineTaskModal } from '../../dailyRoutine/components/DailyRoutineTaskModal';
import { DailyRoutineTaskRow } from '../../dailyRoutine/components/DailyRoutineTaskRow';
import { RoutineTrackerCalendar } from '../../dailyRoutine/components/RoutineTrackerCalendar';
import { useDailyRoutines } from '../../dailyRoutine/viewmodels/useDailyRoutines';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyRoutines'>;

/** Tareas que se tildan y se resetean solas todos los días, con su seguimiento abajo. */
export function DailyRoutinesScreen({ navigation }: Props) {
  const vm = useDailyRoutines();
  // El gesto de período se crea acá (no adentro de `RoutineTrackerCalendar`)
  // para que el swipe de pantalla completa pueda esperar a que falle
  // (`requireToFail`) antes de activarse — así el calendario se queda con
  // el gesto cuando arranca encima suyo, igual que los carruseles en
  // Favoritos.
  const periodSwipe = useHorizontalSwipe({
    onSwipeLeft: vm.period.goToNext,
    onSwipeRight: vm.period.goToPrevious,
  });
  // Deslizar hacia la derecha en cualquier lado que no sea el calendario
  // vuelve a Favoritos.
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => {},
    onSwipeRight: () => navigation.navigate('Favorites'),
    requireToFail: periodSwipe,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <GestureDetector gesture={swipe}>
      <View style={styles.swipeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summary}>
                {vm.total > 0 ? `${vm.doneCount}/${vm.total} tareas hechas hoy` : ''}
              </Text>
              <View style={styles.headerActions}>
                {/* Única forma de volver a agregar "Rutina diaria" a Favoritos si
                    se sacó de ahí — ver `useDailyRoutines.toggleFavorite`. */}
                <FavoriteStar favorite={vm.favorite} onToggle={vm.toggleFavorite} />
                {vm.total > 1 ? (
                  <TouchableOpacity onPress={vm.toggleReorder} hitSlop={8}>
                    <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {vm.total === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>¡No hiciste una lista de tareas diarias aún!</Text>
              </View>
            ) : (
              <>
                {vm.reorderMode ? (
                  <View style={styles.reorderList}>
                    {vm.tasks.map((item, index) => (
                      <ReorderRow
                        key={item.task.id}
                        title={item.task.title}
                        typeLabel={item.done ? 'hecha hoy' : 'pendiente'}
                        isFirst={index === 0}
                        isLast={index === vm.tasks.length - 1}
                        onUp={() => vm.moveTask(item.task.id, 'up')}
                        onDown={() => vm.moveTask(item.task.id, 'down')}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.tasks}>
                    {vm.tasks.map((item, index) => (
                      <DailyRoutineTaskRow
                        key={item.task.id}
                        item={item}
                        first={index === 0}
                        onPress={() => vm.openEditTask(item)}
                        onToggleDone={() => vm.toggleTask(item)}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.addButton} onPress={vm.openNewTask} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>＋ Agregar tarea</Text>
            </TouchableOpacity>

            {vm.tracker ? (
              <RoutineTrackerCalendar
                tracker={vm.tracker}
                entriesByDate={vm.entriesByDate}
                optionCounts={vm.optionCounts}
                period={vm.period}
                swipeGesture={periodSwipe}
              />
            ) : null}
          </>
        )}
      </ScrollView>
      </View>
      </GestureDetector>

      <DailyRoutineTaskModal
        visible={vm.formOpen}
        initial={vm.editing ? { title: vm.editing.task.title, description: vm.editing.task.description ?? '' } : null}
        onClose={vm.closeForm}
        onSave={vm.saveTask}
        onDelete={vm.editing ? vm.deleteTask : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  swipeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  loader: {
    marginTop: 48,
    alignSelf: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  reorderButton: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  reorderList: {
    gap: 8,
  },
  tasks: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
});
