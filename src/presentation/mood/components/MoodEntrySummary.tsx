import { StyleSheet, Text, View } from 'react-native';

import { getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry, NOTE_MAX } from '../../../domain/mood/entities/MoodEntry';
import { formatNote } from '../parseNoteInput';
import { DiagonalSplitSquare } from '../../components/DiagonalSplitSquare';
import { EditButton } from '../../components/EditButton';

interface Props {
  entry: MoodEntry;
  /** Si se pasa, muestra un lápiz a la altura de este resumen para volver a editar. */
  onEdit?: () => void;
}

/** Vista de solo lectura de un registro ya guardado. */
export function MoodEntrySummary({ entry, onEdit }: Props) {
  const noteComment = [
    entry.note != null ? `${formatNote(entry.note)}/${NOTE_MAX}` : null,
    entry.description || null,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <View style={styles.container}>
      <DiagonalSplitSquare
        colors={entry.colors.map((c) => getMoodColorInfo(c).hex)}
        size={44}
        borderColor="#E5E7EB"
      />
      <View style={styles.texts}>
        {entry.colors.map((c) => (
          <Text key={c} style={styles.meaning}>
            {getMoodColorInfo(c).meaning}
          </Text>
        ))}
        {noteComment ? <Text style={styles.noteComment}>{noteComment}</Text> : null}
      </View>
      {onEdit ? <EditButton onPress={onEdit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  texts: {
    flex: 1,
    gap: 3,
  },
  meaning: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  noteComment: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
