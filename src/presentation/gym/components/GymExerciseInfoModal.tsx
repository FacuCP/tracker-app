import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../../core/theme';
import { GymExercise } from '../../../domain/gym/entities/GymExercise';
import { LinkedText } from '../../components/LinkedText';

interface Props {
  exercise: GymExercise | null;
  onClose: () => void;
}

/** Modal de solo lectura con el resumen del ejercicio y su descripción (con links tocables). */
export function GymExerciseInfoModal({ exercise, onClose }: Props) {
  return (
    <Modal visible={exercise != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {exercise ? (
            <>
              <Text style={styles.title}>{exercise.name}</Text>
              <Text style={styles.summary}>
                {exercise.sets} series ×{' '}
                {exercise.reps == null
                  ? 'al fallo'
                  : exercise.isTimed
                    ? `${exercise.reps} seg`
                    : `${exercise.reps} rep`}
                {exercise.weightKg > 0 ? ` · ${exercise.weightKg} kg` : ''}
              </Text>
              {exercise.description ? (
                <ScrollView style={styles.descriptionBox}>
                  <LinkedText text={exercise.description} style={styles.description} />
                </ScrollView>
              ) : null}
            </>
          ) : null}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  summary: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  descriptionBox: {
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  closeButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
