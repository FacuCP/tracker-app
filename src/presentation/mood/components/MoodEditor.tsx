import { Trash } from 'lucide-react-native';
import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { MoodColor, getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';
import { NOTE_MAX, NOTE_MIN } from '../../../domain/mood/entities/MoodEntry';
import { parseNoteInput } from '../parseNoteInput';
import { DiagonalSplitSquare } from '../../components/DiagonalSplitSquare';
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
  /** Se muestra a la izquierda, a la misma altura que "Guardar"/"Borrar" — lo usa `MoodTrackerCard` para "Ver progreso". */
  leftAction?: ReactNode;
}

/**
 * Bloque reutilizable para cargar/editar el ánimo de un día: preview,
 * selector de colores (con la nota al costado del último, dentro de la misma
 * grilla), descripción opcional y botones. Lo usan tanto la card del home
 * como el modal de edición del calendario.
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
  leftAction,
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
                {getMoodColorInfo(c).meaning}
              </Text>
            ))
          )}
        </View>
      </View>

      <MoodColorPicker
        selected={colors}
        onChange={onColorsChange}
        trailing={
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>
              Nota ({NOTE_MIN}–{NOTE_MAX})
            </Text>
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
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Descripción (opcional)"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={onDescriptionChange}
        multiline
      />

      <View style={[styles.actions, leftAction ? styles.actionsBetween : null]}>
        {leftAction ?? null}
        <View style={styles.actionButtons}>
          {onDelete ? (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete} hitSlop={10} activeOpacity={0.6}>
              <Trash size={20} color="#dc2626" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  noteBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    justifyContent: 'center',
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: 56,
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
    padding: 10,
    minHeight: 44,
    textAlignVertical: 'top',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionsBetween: {
    justifyContent: 'space-between',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
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
    padding: 10,
  },
});
