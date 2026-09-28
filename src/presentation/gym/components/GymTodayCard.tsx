import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { FavoriteStar } from '../../components/FavoriteStar';
import { useGymTodayCard } from '../viewmodels/useGymTodayCard';
import { GymExerciseInfoModal } from './GymExerciseInfoModal';
import { WeightStepRow } from './WeightStepRow';

interface Props {
  onFavoriteToggled?: () => void;
  /** Si no hay ninguna rutina creada todavía, link para ir a crear una. */
  onOpenGym?: () => void;
  /** Link para ver la rutina elegida completa. */
  onOpenRoutine?: (routineId: string) => void;
}

/** Cuadro "Seleccionar rutina para hoy": elegir, ir sumando series, avanzar. */
export function GymTodayCard({ onFavoriteToggled, onOpenGym, onOpenRoutine }: Props) {
  const vm = useGymTodayCard();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [weightEditorOpen, setWeightEditorOpen] = useState(false);

  async function toggleFavorite() {
    await vm.toggleFavorite();
    onFavoriteToggled?.();
  }

  function choose(routineId: string) {
    setDropdownOpen(false);
    vm.selectRoutine(routineId);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Rutina de hoy</Text>
        <FavoriteStar favorite={vm.favorite} onToggle={toggleFavorite} />
      </View>

      {vm.loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : vm.routines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Todavía no creaste ninguna rutina.</Text>
          {onOpenGym ? (
            <TouchableOpacity onPress={onOpenGym}>
              <Text style={styles.link}>Ir a Gimnasio →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : vm.pickerRoutines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Tus rutinas todavía no tienen ejercicios. Agregales alguno para poder elegirlas acá.
          </Text>
          {onOpenGym ? (
            <TouchableOpacity onPress={onOpenGym}>
              <Text style={styles.link}>Ir a Gimnasio →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : !vm.selectedRoutineId || !vm.session ? (
        <View style={styles.picker}>
          <Text style={styles.pickerLabel}>Seleccionar rutina para hoy</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownButtonText}>Elegir rutina</Text>
            <Text style={styles.dropdownChevron}>{dropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {dropdownOpen ? (
            <View style={styles.dropdownList}>
              {vm.pickerRoutines.map((routine, index) => (
                <TouchableOpacity
                  key={routine.id}
                  style={[styles.dropdownItem, index > 0 && styles.dropdownItemBorder]}
                  onPress={() => choose(routine.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      vm.doneByRoutine[routine.id] && styles.dropdownItemDone,
                    ]}
                  >
                    {routine.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : vm.session.routineDone ? (
        <View style={styles.done}>
          <Text style={styles.doneText}>
            ¡Completaste "{vm.session.routine.name}" esta semana!
          </Text>
          <TouchableOpacity onPress={vm.clearRoutine}>
            <Text style={styles.link}>Elegir otra rutina</Text>
          </TouchableOpacity>
        </View>
      ) : vm.displayExercise ? (
        <View style={styles.exercise}>
          <Text style={styles.routineName}>{vm.session.routine.name}</Text>
          <View style={styles.exerciseNameRow}>
            <Text style={styles.exerciseName}>{vm.displayExercise.exercise.name}</Text>
            {vm.displayExercise.exercise.description ? (
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setInfoOpen(true)}
                hitSlop={8}
              >
                <Text style={styles.infoButtonText}>i</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.exerciseInfo}>
            {vm.displayExercise.exercise.reps == null
              ? 'Al fallo'
              : vm.displayExercise.exercise.isTimed
                ? `${vm.displayExercise.exercise.reps} segundos`
                : `${vm.displayExercise.exercise.reps} repeticiones`}
            {vm.displayExercise.exercise.weightKg > 0 ? ` · ${vm.displayExercise.exercise.weightKg} kg` : ''}
          </Text>

          <View style={styles.setsRow}>
            <TouchableOpacity
              style={[styles.setButton, (vm.busy || vm.displayExercise.completedSets === 0) && styles.disabled]}
              onPress={vm.removeSet}
              disabled={vm.busy || vm.displayExercise.completedSets === 0}
              activeOpacity={0.7}
            >
              <Text style={styles.setButtonSign}>−</Text>
            </TouchableOpacity>

            <Text style={styles.setsValue}>
              {vm.displayExercise.completedSets}/{vm.displayExercise.exercise.sets}
            </Text>
            <Text style={styles.setsLabel}>series</Text>

            <TouchableOpacity
              style={[styles.setButton, styles.setButtonPrimary, vm.busy && styles.disabled]}
              onPress={vm.addSet}
              disabled={vm.busy}
              activeOpacity={0.7}
            >
              <Text style={styles.setButtonPrimarySign}>＋</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => setWeightEditorOpen((v) => !v)}>
              <Text style={styles.link}>{weightEditorOpen ? 'Cerrar peso' : 'Ajustar peso'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={vm.skip} disabled={vm.busy}>
              <Text style={styles.linkMuted}>Saltar ejercicio</Text>
            </TouchableOpacity>
          </View>

          {weightEditorOpen ? (
            <View style={styles.weightBox}>
              <WeightStepRow valueKg={vm.displayExercise.exercise.weightKg} onAdjust={vm.adjustWeight} />
            </View>
          ) : null}

          <View style={styles.footerRow}>
            {onOpenRoutine ? (
              <TouchableOpacity onPress={() => onOpenRoutine(vm.session!.routine.id)}>
                <Text style={styles.link}>Ver rutina completa →</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={vm.clearRoutine}>
              <Text style={styles.linkMuted}>Cambiar rutina</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>Esta rutina no tiene ejercicios todavía.</Text>
      )}

      <GymExerciseInfoModal
        exercise={infoOpen ? (vm.displayExercise?.exercise ?? null) : null}
        onClose={() => setInfoOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  loader: {
    marginVertical: 16,
  },
  empty: {
    gap: 8,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  link: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  linkMuted: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  picker: {
    gap: 10,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownButtonText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  dropdownChevron: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
  },
  dropdownItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dropdownItemDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  done: {
    gap: 8,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  exercise: {
    gap: 2,
  },
  routineName: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '800',
    fontStyle: 'italic',
    color: theme.colors.accent,
  },
  exerciseInfo: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  weightBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  setsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  setButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setButtonPrimary: {
    backgroundColor: theme.colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },
  setButtonSign: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  setButtonPrimarySign: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  setsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
    minWidth: 56,
    textAlign: 'center',
  },
  setsLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginLeft: -8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
