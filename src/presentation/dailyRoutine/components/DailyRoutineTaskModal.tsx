import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import {
  MAX_TASK_DESCRIPTION,
  MAX_TASK_TITLE,
} from '../../../domain/dailyRoutine/entities/DailyRoutineTask';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';

export interface DailyRoutineTaskDraft {
  title: string;
  description: string;
}

interface Props {
  visible: boolean;
  /** Si viene, se está editando esa tarea; si no, es una nueva. */
  initial: DailyRoutineTaskDraft | null;
  onClose: () => void;
  onSave: (draft: DailyRoutineTaskDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

/** Modal para crear o editar una tarea de rutina diaria: título y descripción. */
export function DailyRoutineTaskModal({ visible, initial, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setTitle(initial?.title ?? '');
      setDescription(initial?.description ?? '');
      setSaving(false);
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  const canSave = title.trim().length > 0 && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ title, description });
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
            <Text style={styles.title}>{initial ? 'Editar tarea' : 'Nueva tarea'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Título"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={MAX_TASK_TITLE}
              />
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Descripción (opcional)"
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={MAX_TASK_DESCRIPTION}
                multiline
                textAlignVertical="top"
              />
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
    maxHeight: '85%',
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
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  descriptionInput: {
    minHeight: 70,
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
