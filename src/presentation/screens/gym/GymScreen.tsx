import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { CreateGymRoutineModal } from '../../gym/components/CreateGymRoutineModal';
import { GymRoutineCard } from '../../gym/components/GymRoutineCard';
import { GymTodayCard } from '../../gym/components/GymTodayCard';
import { useGymScreen } from '../../gym/viewmodels/useGymScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Gym'>;

export function GymScreen({ navigation, route }: Props) {
  const vm = useGymScreen();

  const { openCreate } = vm;
  useEffect(() => {
    if (route.params?.create) {
      navigation.setParams({ create: undefined });
      openCreate();
    }
  }, [route.params?.create, navigation, openCreate]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>{vm.greeting}</Text>
        <Text style={styles.subtitle}>Tus rutinas de gimnasio</Text>

        <GymTodayCard
          onOpenRoutine={(routineId) => navigation.navigate('GymRoutineDetail', { routineId })}
        />

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.routines.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Todavía no tenés rutinas.</Text>
              </View>
            ) : (
              vm.routines.map((routine) => (
                <GymRoutineCard
                  key={routine.id}
                  routine={routine}
                  exerciseCount={vm.summaries[routine.id]?.total ?? 0}
                  doneThisWeek={vm.summaries[routine.id]?.doneThisWeek ?? false}
                  onOpen={() => navigation.navigate('GymRoutineDetail', { routineId: routine.id })}
                />
              ))
            )}

            <TouchableOpacity style={styles.createButton} onPress={vm.openCreate} activeOpacity={0.8}>
              <Text style={styles.createText}>＋ Crear rutina nueva</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <CreateGymRoutineModal
        visible={vm.createOpen}
        onClose={vm.closeCreate}
        onCreate={vm.createRoutine}
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: -6,
    marginBottom: 6,
  },
  loader: {
    marginTop: 24,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
  createButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
});
