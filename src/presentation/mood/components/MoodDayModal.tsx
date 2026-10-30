import { Trash } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize, formatLongDate, IsoDate } from '../../../core/utils/date';
import { MoodColor } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry } from '../../../domain/mood/entities/MoodEntry';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { formatNote } from '../parseNoteInput';
import { MoodEditor } from './MoodEditor';
import { MoodEntrySummary } from './MoodEntrySummary';

interface Props {
  date: IsoDate | null;
  entry: MoodEntry | null;
  onClose: () => void;
  onSave: (colors: MoodColor[], description: string, note: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

/**
 * Modal para ver/editar el ánimo de un día concreto desde el calendario. Si
 * el día ya tiene algo cargado, arranca en una vista de solo lectura (el
 * botón "Editar" pasa a la forma editable, precargada); si está vacío, va
 * directo a la forma editable, como siempre — mismo patrón que
 * `TrackerDayModal`.
 */
export function MoodDayModal({ date, entry, onClose, onSave, onDelete }: Props) {
  const [colors, setColors] = useState<MoodColor[]>([]);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(entry != null);

  useEffect(() => {
    setColors(entry ? [...entry.colors] : []);
    setDescription(entry?.description ?? '');
    setNote(entry?.note != null ? formatNote(entry.note) : '');
    setSaving(false);
    setViewMode(entry != null);
  }, [date, entry]);

  const visible = date != null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(colors, description, note);
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
            <Text style={styles.title}>{date ? capitalize(formatLongDate(date)) : ''}</Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {viewMode && entry ? (
                <MoodEntrySummary entry={entry} />
              ) : (
                <MoodEditor
                  colors={colors}
                  onColorsChange={setColors}
                  description={description}
                  onDescriptionChange={setDescription}
                  note={note}
                  onNoteChange={setNote}
                  onSave={handleSave}
                  saving={saving}
                  saveLabel={entry ? 'Actualizar' : 'Guardar'}
                  onDelete={entry ? onDelete : undefined}
                />
              )}
            </ScrollView>

            {viewMode && entry ? (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete} hitSlop={10} activeOpacity={0.6}>
                  <Trash size={20} color="#dc2626" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.editButton]} onPress={() => setViewMode(false)}>
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
    maxHeight: '88%',
    gap: 12,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  editButton: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  editButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 10,
  },
});
