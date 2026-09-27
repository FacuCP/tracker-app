import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { theme } from '../../../core/theme';
import {
  DEFAULT_REPS,
  DEFAULT_SETS,
  MAX_DESCRIPTION,
  MAX_EXERCISE_NAME,
  WEIGHT_STEPS_KG,
  adjustWeightKg,
} from '../../../domain/gym/entities/GymExercise';
import { GymSessionExercise } from '../../../domain/gym/entities/GymSession';
import { Checkbox } from '../../components/Checkbox';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';

export interface GymExerciseDraft {
  name: string;
  sets: number;
  /** null = "al fallo", sin repeticiones fijas. */
  reps: number | null;
  /** 0 = sin peso. */
  weightKg: number;
  /** Notas opcionales; puede incluir un link. */
  description: string;
}

interface Props {
  visible: boolean;
  /** Si viene, se está editando ese ejercicio; si no, es uno nuevo. */
  initial: GymSessionExercise | null;
  onClose: () => void;
  onSave: (draft: GymExerciseDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

function formatStep(step: number): string {
  return Number.isInteger(step) ? String(step) : step.toFixed(1);
}

/**
 * Modal para crear o editar un ejercicio: nombre, series, repeticiones (o "al
 * fallo") y peso, con 3 botones para sumar y 3 para restar (±1 / ±2.5 / ±5 kg).
 * El orden dentro de la rutina se cambia desde el modo "Ordenar" del detalle.
 */
export function GymExerciseModal({ visible, initial, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [toFailure, setToFailure] = useState(false);
  const [weightKg, setWeightKg] = useState(0);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setName(initial?.exercise.name ?? '');
      setSets(initial ? String(initial.exercise.sets) : String(DEFAULT_SETS));
      const initialReps = initial?.exercise.reps;
      setToFailure(initial != null && initialReps == null);
      setReps(initialReps != null ? String(initialReps) : String(DEFAULT_REPS));
      setWeightKg(initial?.exercise.weightKg ?? 0);
      setDescription(initial?.exercise.description ?? '');
      setSaving(false);
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  const setsValue = Number(sets);
  const repsValue = Number(reps);

  const setsError =
    sets.trim() === '' || !Number.isInteger(setsValue) || setsValue < 1
      ? 'Poné un entero mayor o igual a 1'
      : undefined;
  const repsError =
    !toFailure && (reps.trim() === '' || !Number.isInteger(repsValue) || repsValue < 1)
      ? 'Poné un entero mayor o igual a 1'
      : undefined;

  const canSave = name.trim().length > 0 && !setsError && !repsError && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name,
        sets: setsValue,
        reps: toFailure ? null : repsValue,
        weightKg,
        description,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>{initial ? 'Editar ejercicio' : 'Nuevo ejercicio'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={MAX_EXERCISE_NAME}
              />

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Series</Text>
                  <TextInput
                    style={[styles.input, setsError && sets.length > 0 && styles.inputError]}
                    placeholder={String(DEFAULT_SETS)}
                    placeholderTextColor={theme.colors.textMuted}
                    value={sets}
                    onChangeText={setSets}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Repeticiones</Text>
                  <TextInput
                    style={[
                      styles.input,
                      toFailure && styles.inputDisabled,
                      repsError && reps.length > 0 && styles.inputError,
                    ]}
                    placeholder={String(DEFAULT_REPS)}
                    placeholderTextColor={theme.colors.textMuted}
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="number-pad"
                    maxLength={3}
                    editable={!toFailure}
                  />
                </View>
              </View>
              {setsError && sets.length > 0 ? <Text style={styles.error}>Series: {setsError}</Text> : null}
              {repsError && reps.length > 0 ? <Text style={styles.error}>Repeticiones: {repsError}</Text> : null}

              <TouchableOpacity
                style={styles.failureToggle}
                onPress={() => setToFailure((v) => !v)}
                activeOpacity={0.7}
              >
                <Checkbox checked={toFailure} onToggle={() => setToFailure((v) => !v)} />
                <Text style={styles.failureLabel}>Al fallo (sin repeticiones fijas)</Text>
              </TouchableOpacity>

              <View style={styles.weightBox}>
                <View style={styles.weightRow}>
                  <View style={styles.weightSide}>
                    {[...WEIGHT_STEPS_KG].reverse().map((step) => (
                      <View key={`minus-${step}`} style={styles.stepWrap}>
                        <TouchableOpacity
                          style={styles.stepButton}
                          onPress={() => setWeightKg((w) => adjustWeightKg(w, -step))}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.stepSign}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepLabel}>{formatStep(step)}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.weightValue}>{weightKg} kg</Text>

                  <View style={styles.weightSide}>
                    {WEIGHT_STEPS_KG.map((step) => (
                      <View key={`plus-${step}`} style={styles.stepWrap}>
                        <TouchableOpacity
                          style={[styles.stepButton, styles.stepButtonPlus]}
                          onPress={() => setWeightKg((w) => adjustWeightKg(w, step))}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.stepSignPlus}>＋</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepLabel}>{formatStep(step)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Descripción (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="Notas, técnica, link a un video..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={MAX_DESCRIPTION}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.actions}>
              {onDelete ? (
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
                  <Text style={styles.deleteText}>Borrar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.button, styles.saveButton, !canSave && styles.disabled]}
                onPress={submit}
                disabled={!canSave}
              >
                <Text style={styles.saveText}>{initial ? 'Guardar' : 'Agregar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '88%',
    gap: 6,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  form: {
    gap: 12,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  inputDisabled: {
    opacity: 0.4,
  },
  descriptionInput: {
    minHeight: 70,
  },
  inputError: {
    borderColor: '#f87171',
  },
  error: {
    color: '#b91c1c',
    fontSize: 12,
  },
  failureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  failureLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  weightBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
  },
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
});
