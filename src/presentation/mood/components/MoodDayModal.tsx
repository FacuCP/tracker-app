import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { capitalize, formatLongDate, IsoDate } from '../../../core/utils/date';
import { MoodColor } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry } from '../../../domain/mood/entities/MoodEntry';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { formatNote } from '../parseNoteInput';
import { MoodEditor } from './MoodEditor';

interface Props {
  date: IsoDate | null;
  entry: MoodEntry | null;
  onClose: () => void;
  onSave: (colors: MoodColor[], description: string, note: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

/** Modal para editar el ánimo de un día concreto desde el calendario. */
export function MoodDayModal({ date, entry, onClose, onSave, onDelete }: Props) {
  const [colors, setColors] = useState<MoodColor[]>([]);
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setColors(entry ? [...entry.colors] : []);
    setDescription(entry?.description ?? '');
    setNote(entry?.note != null ? formatNote(entry.note) : '');
    setSaving(false);
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
            </ScrollView>
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
});
