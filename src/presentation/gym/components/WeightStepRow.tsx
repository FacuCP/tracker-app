import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { WEIGHT_STEPS_KG } from '../../../domain/gym/entities/GymExercise';

interface Props {
  valueKg: number;
  onAdjust: (delta: number) => void;
}

function formatStep(step: number): string {
  return Number.isInteger(step) ? String(step) : step.toFixed(1);
}

/**
 * Fila `− − − peso + + +`: 3 pasos para bajar y 3 para subir el peso
 * (±1 / ±2.5 / ±5 kg), con la cantidad de cada botón como etiqueta debajo.
 * Reutilizada en el editor de ejercicio y en "Ajustar peso" de Rutina de hoy.
 */
export function WeightStepRow({ valueKg, onAdjust }: Props) {
  return (
    <View style={styles.weightRow}>
      <View style={styles.weightSide}>
        {[...WEIGHT_STEPS_KG].reverse().map((step) => (
          <View key={`minus-${step}`} style={styles.stepWrap}>
            <TouchableOpacity style={styles.stepButton} onPress={() => onAdjust(-step)} activeOpacity={0.7}>
              <Text style={styles.stepSign}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepLabel}>{formatStep(step)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.weightValue}>{valueKg} kg</Text>

      <View style={styles.weightSide}>
        {WEIGHT_STEPS_KG.map((step) => (
          <View key={`plus-${step}`} style={styles.stepWrap}>
            <TouchableOpacity
              style={[styles.stepButton, styles.stepButtonPlus]}
              onPress={() => onAdjust(step)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepSignPlus}>＋</Text>
            </TouchableOpacity>
            <Text style={styles.stepLabel}>{formatStep(step)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightSide: {
    flexDirection: 'row',
    gap: 6,
  },
  weightValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  stepWrap: {
    alignItems: 'center',
    gap: 2,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPlus: {
    backgroundColor: '#dcfce7',
  },
  stepSign: {
    fontSize: 15,
    fontWeight: '800',
    color: '#b91c1c',
  },
  stepSignPlus: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803d',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
});
