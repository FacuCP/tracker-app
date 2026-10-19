import { StyleSheet, Text } from 'react-native';

import { theme } from '../../../core/theme';
import { GymExercise } from '../../../domain/gym/entities/GymExercise';
import { InfoModal } from '../../components/InfoModal';

interface Props {
  exercise: GymExercise | null;
  onClose: () => void;
}

/** Modal de solo lectura con el resumen del ejercicio y su descripción (con links tocables). */
export function GymExerciseInfoModal({ exercise, onClose }: Props) {
  return (
    <InfoModal
      visible={exercise != null}
      title={exercise?.name ?? ''}
      description={exercise?.description}
      onClose={onClose}
    >
      {exercise ? (
        <Text style={styles.summary}>
          {exercise.sets} series ×{' '}
          {exercise.reps == null
            ? 'al fallo'
            : exercise.isTimed
              ? `${exercise.reps} seg`
              : `${exercise.reps} rep`}
          {exercise.weightKg > 0 ? ` · ${exercise.weightKg} kg` : ''}
        </Text>
      ) : null}
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  summary: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
