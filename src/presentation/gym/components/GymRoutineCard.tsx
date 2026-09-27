import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { GymRoutine } from '../../../domain/gym/entities/GymRoutine';

interface Props {
  routine: GymRoutine;
  exerciseCount: number;
  doneThisWeek: boolean;
  onOpen: () => void;
}

/** Card de una rutina en el listado de Gimnasio. */
export function GymRoutineCard({ routine, exerciseCount, doneThisWeek, onOpen }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.7}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={styles.count}>
          {exerciseCount === 0
            ? 'Sin ejercicios'
            : `${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`}
        </Text>
      </View>
      {doneThisWeek ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Completada por esta semana</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  count: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  badge: {
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 110,
  },
  badgeText: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
  },
});
