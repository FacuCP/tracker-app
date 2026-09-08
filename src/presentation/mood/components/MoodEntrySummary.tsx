import { StyleSheet, Text, View } from 'react-native';

import { getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';
import { MoodEntry } from '../../../domain/mood/entities/MoodEntry';
import { formatNote } from '../parseNoteInput';
import { DiagonalSplitSquare } from '../../components/DiagonalSplitSquare';

interface Props {
  entry: MoodEntry;
}

/** Vista de solo lectura de un registro ya guardado. */
export function MoodEntrySummary({ entry }: Props) {
  return (
    <View style={styles.container}>
      <DiagonalSplitSquare
        colors={entry.colors.map((c) => getMoodColorInfo(c).hex)}
        size={56}
        borderColor="#E5E7EB"
      />
      <View style={styles.texts}>
        {entry.colors.map((c) => (
          <Text key={c} style={styles.meaning}>
            {getMoodColorInfo(c).name} · {getMoodColorInfo(c).meaning}
          </Text>
        ))}
        {entry.note != null ? (
          <Text style={styles.note}>Nota {formatNote(entry.note)}</Text>
        ) : null}
        {entry.description ? (
          <Text style={styles.description}>“{entry.description}”</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  note: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '800',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
