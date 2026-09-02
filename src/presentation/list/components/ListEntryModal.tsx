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

import { IsoDate, todayIso } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { MAX_ENTRY_NAME } from '../../../domain/list/entities/ListEntry';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { parseRating } from '../parseRating';
import { DateField } from './DateField';

export interface ListEntryDraft {
  name: string;
  date: IsoDate;
  comment: string;
  /** Texto del campo Rating (se parsea al guardar). */
  rating: string;
}

interface Props {
  visible: boolean;
  /** Nombre de la lista, para el título. */
  listName: string;
  /** En una to-do list, el campo "Rating" se llama "Prioridad". */
  isTodo?: boolean;
  /** Valores iniciales (para editar). Si es null, es una entrada nueva. */
  initial: ListEntryDraft | null;
  onClose: () => void;
  onSave: (draft: ListEntryDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

/** Modal para crear o editar una entrada de una lista. */
export function ListEntryModal({
  visible,
  listName,
  isTodo = false,
  initial,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [date, setDate] = useState<IsoDate>(todayIso());
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [saving, setSaving] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    // Solo (re)inicializamos cuando el modal se abre, no en cada render
    // (el prop `initial` es un objeto nuevo cada vez).
    if (visible && !wasVisible.current) {
      setName(initial?.name ?? '');
      setDate(initial?.date ?? todayIso());
      setComment(initial?.comment ?? '');
      setRating(initial?.rating ?? '');
      setSaving(false);
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  const ratingError = parseRating(rating).error;
  const canSave = name.trim().length > 0 && !ratingError && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name, date, comment, rating });
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
            <Text style={styles.title}>{initial ? 'Editar entrada' : 'Nueva entrada'}</Text>
            <Text style={styles.subtitle}>{listName}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={MAX_ENTRY_NAME}
              />

              <DateField value={date} onChange={setDate} />

              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{isTodo ? '⚑ Prioridad' : '★ Rating'}</Text>
                <TextInput
                  style={[styles.ratingInput, ratingError && styles.inputError]}
                  placeholder="—"
                  placeholderTextColor={theme.colors.textMuted}
                  value={rating}
                  onChangeText={setRating}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
                {ratingError ? <Text style={styles.errorText}>{ratingError}</Text> : null}
              </View>

              <TextInput
                style={[styles.input, styles.comment]}
                placeholder="Comentario (opcional)"
                placeholderTextColor={theme.colors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
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
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
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
  inputError: {
    borderColor: '#f87171',
  },
  comment: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  ratingInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 70,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.colors.text,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
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
