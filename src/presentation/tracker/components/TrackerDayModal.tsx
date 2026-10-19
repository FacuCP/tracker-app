import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { capitalize, formatLongDate, IsoDate } from '../../../core/utils/date';
import { MAX_OPTIONS_PER_DAY, Tracker } from '../../../domain/tracker/entities/Tracker';
import { MAX_TRACKER_COMMENT, TrackerEntry } from '../../../domain/tracker/entities/TrackerEntry';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { Counter } from './Counter';

interface Props {
  tracker: Tracker;
  date: IsoDate | null;
  entry: TrackerEntry | null;
  onClose: () => void;
  onSave: (input: { optionIds?: string[]; value?: number; comment?: string }) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

/** Modal para editar el registro de un día de un tracker del usuario. */
export function TrackerDayModal({ tracker, date, entry, onClose, onSave, onDelete }: Props) {
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const hasOptions = tracker.options.length > 0;

  useEffect(() => {
    setOptionIds([...(entry?.optionIds ?? [])]);
    setCount(entry?.value != null ? Math.max(0, Math.round(entry.value)) : 0);
    setComment(entry?.comment ?? '');
    setSaving(false);
  }, [date, entry]);

  function toggleOption(id: string) {
    setOptionIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < MAX_OPTIONS_PER_DAY) return [...prev, id];
      return [...prev.slice(1), id];
    });
  }

  // Un tracker con contador siempre se puede guardar (aunque sea con 0); si
  // solo tiene opciones, hace falta elegir al menos una.
  const canSave = tracker.hasCounter || optionIds.length > 0;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        optionIds: hasOptions ? optionIds : undefined,
        value: tracker.hasCounter ? count : undefined,
        comment,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={date != null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>{date ? capitalize(formatLongDate(date)) : ''}</Text>
            <Text style={styles.trackerName}>{tracker.name}</Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
            >
              {hasOptions ? (
                <View style={styles.options}>
                  {tracker.options.map((option) => {
                    const selected = optionIds.includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionChip,
                          { borderColor: option.color },
                          selected && { backgroundColor: option.color },
                        ]}
                        onPress={() => toggleOption(option.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {tracker.hasCounter ? (
                <View style={styles.counterWrap}>
                  <Counter value={count} onChange={(next) => setCount(Math.max(0, next))} />
                </View>
              ) : null}

              <TextInput
                style={styles.commentInput}
                placeholder="Comentario (opcional)"
                placeholderTextColor="#9ca3af"
                value={comment}
                onChangeText={setComment}
                maxLength={MAX_TRACKER_COMMENT}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.actions}>
              {entry ? (
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
                  <Text style={styles.deleteText}>Borrar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.button, styles.saveButton, (!canSave || saving) && styles.disabled]}
                onPress={handleSave}
                disabled={!canSave || saving}
              >
                <Text style={styles.saveText}>{entry ? 'Actualizar' : 'Guardar'}</Text>
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
    backgroundColor: '#f8f9fc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  trackerName: {
    fontSize: 13,
    color: '#6b7280',
  },
  body: {
    marginVertical: 12,
  },
  bodyContent: {
    gap: 16,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
  },
  optionText: {
    fontWeight: '700',
    color: '#374151',
  },
  optionTextSelected: {
    color: '#fff',
  },
  counterWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    fontSize: 14,
    color: '#111827',
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
    backgroundColor: '#2563eb',
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
