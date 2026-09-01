import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { MoodColor, getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';
import { NOTE_MAX, NOTE_MIN } from '../../../domain/mood/entities/MoodEntry';
import { parseNoteInput } from '../parseNoteInput';
import { DiagonalSplitSquare } from './DiagonalSplitSquare';
import { MoodColorPicker } from './MoodColorPicker';

interface Props {
  colors: MoodColor[];
  onColorsChange: (colors: MoodColor[]) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  /** Texto del campo "Nota" (se guarda como string para poder tipear "7."). */
  note: string;
  onNoteChange: (text: string) => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  onDelete?: () => void;
}

/**
 * Bloque reutilizable para cargar/editar el ánimo de un día: preview,
 * selector de colores, nota del 1 al 10, descripción opcional y botones. Lo
 * usan tanto la card del home como el modal de edición del calendario.
 */
export function MoodEditor({
  colors,
  onColorsChange,
  description,
  onDescriptionChange,
  note,
  onNoteChange,
  onSave,
  saving = false,
  saveLabel = 'Guardar',
  onDelete,
}: Props) {
  const hex = colors.map((c) => getMoodColorInfo(c).hex);
  const noteError = parseNoteInput(note).error;
  const canSave = colors.length > 0 && !saving && !noteError;

  return (
    <View style={styles.container}>
      <View style={styles.previewRow}>
        <DiagonalSplitSquare colors={hex} size={48} borderColor="#E5E7EB" />
        <View style={styles.meanings}>
          {colors.length === 0 ? (
            <Text style={styles.placeholder}>Elegí uno o dos colores</Text>
          ) : (
            colors.map((c) => (
              <Text key={c} style={styles.meaning}>
                {getMoodColorInfo(c).name} · {getMoodColorInfo(c).meaning}
              </Text>
            ))
          )}
        </View>
      </View>

      <MoodColorPicker selected={colors} onChange={onColorsChange} />

      <View style={styles.noteRow}>
        <Text style={styles.noteLabel}>Nota ({NOTE_MIN}–{NOTE_MAX})</Text>
        <TextInput
          style={[styles.noteInput, noteError && styles.noteInputError]}
          placeholder="—"
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={onNoteChange}
          keyboardType="decimal-pad"
          maxLength={4}
        />
        {noteError ? <Text style={styles.noteErrorText}>{noteError}</Text> : null}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Descripción (opcional)"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={onDescriptionChange}
        multiline
      />

      <View style={styles.actions}>
        {onDelete ? (
          <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
            <Text style={styles.deleteText}>Borrar</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.button, styles.saveButton, !canSave && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>{saveLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meanings: {
    flex: 1,
    gap: 2,
  },
  placeholder: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  meaning: {
    color: '#374151',
    fontSize: 13,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: 64,
    textAlign: 'center',
    color: '#111827',
    fontWeight: '700',
  },
  noteInputError: {
    borderColor: '#f87171',
  },
  noteErrorText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
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
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
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
