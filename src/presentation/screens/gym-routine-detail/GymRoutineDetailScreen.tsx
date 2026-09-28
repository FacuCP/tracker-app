import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { ReorderRow } from '../../components/ReorderRow';
import { GymExerciseModal } from '../../gym/components/GymExerciseModal';
import { GymExerciseRow } from '../../gym/components/GymExerciseRow';
import { useGymRoutineDetail } from '../../gym/viewmodels/useGymRoutineDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'GymRoutineDetail'>;

export function GymRoutineDetailScreen({ route, navigation }: Props) {
  const { routineId } = route.params;
  const vm = useGymRoutineDetail(routineId);
  const routine = vm.routine;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: routine?.name ?? 'Rutina',
      headerRight: () =>
        routine ? (
          <Text style={styles.headerLink} onPress={vm.openNewExercise}>
            Agregar Ejercicio
          </Text>
        ) : null,
    });
  }, [navigation, routine, vm.openNewExercise]);

  function confirmResetRoutine() {
    if (!routine) return;
    Alert.alert(
      'Resetear rutina',
      `Se vuelven a 0 las series hechas de todos los ejercicios de "${routine.name}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Resetear', style: 'destructive', onPress: vm.resetRoutine },
      ],
    );
  }

  function confirmDeleteRoutine() {
    if (!routine) return;
    Alert.alert('Borrar rutina', `Se borrará "${routine.name}" y todos sus ejercicios.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await vm.deleteRoutine();
          navigation.goBack();
        },
      },
    ]);
  }

  if (!vm.loading && !routine) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Text style={styles.missing}>Esta rutina ya no existe.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {vm.loading || !routine ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.routineDone ? (
              <View style={styles.doneBanner}>
                <Text style={styles.doneBannerText}>Completada por esta semana</Text>
              </View>
            ) : null}

            {vm.exercises.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Rutina vacía. Agregá un ejercicio con "Agregar Ejercicio".
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.headerRow}>
                  <Text style={styles.sectionTitle}>Ejercicios</Text>
                  {vm.exercises.length > 1 ? (
                    <TouchableOpacity onPress={vm.toggleReorder} hitSlop={8}>
                      <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {vm.reorderMode ? (
                  <View style={styles.reorderList}>
                    {vm.exercises.map((item, index) => (
                      <ReorderRow
                        key={item.exercise.id}
                        title={item.exercise.name}
                        typeLabel={`${item.exercise.sets} series × ${
                          item.exercise.reps == null
                            ? 'al fallo'
                            : item.exercise.isTimed
                              ? `${item.exercise.reps} s`
                              : `${item.exercise.reps} rep`
                        }`}
                        isFirst={index === 0}
                        isLast={index === vm.exercises.length - 1}
                        onUp={() => vm.moveExercise(item.exercise.id, 'up')}
                        onDown={() => vm.moveExercise(item.exercise.id, 'down')}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.exercises}>
                    {vm.exercises.map((item, index) => (
                      <GymExerciseRow
                        key={item.exercise.id}
                        item={item}
                        first={index === 0}
                        onPress={() => vm.openEditExercise(item)}
                        onAddSet={() => vm.addSet(item)}
                        onRemoveSet={() => vm.removeSet(item)}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.resetRoutine} onPress={confirmResetRoutine}>
              <Text style={styles.resetRoutineText}>Resetear rutina</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteRoutine} onPress={confirmDeleteRoutine}>
              <Text style={styles.deleteRoutineText}>Borrar esta rutina</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <GymExerciseModal
        visible={vm.formOpen}
        initial={vm.editing}
        onClose={vm.closeForm}
        onSave={vm.saveExercise}
        onDelete={vm.editing ? vm.deleteExercise : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 16,
  },
  headerLink: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  loader: {
    marginTop: 48,
    alignSelf: 'center',
  },
  doneBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneBannerText: {
    color: '#15803d',
    fontWeight: '800',
  },
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  reorderButton: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  reorderList: {
    marginTop: 10,
    marginHorizontal: 16,
    gap: 8,
  },
  exercises: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  resetRoutine: {
    marginTop: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetRoutineText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  deleteRoutine: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteRoutineText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  missing: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.textMuted,
  },
});
