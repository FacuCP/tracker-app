import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize } from '../../../core/utils/date';
import { useMoodTrackerCard } from '../viewmodels/useMoodTrackerCard';
import { MoodEditor } from './MoodEditor';
import { MoodEntrySummary } from './MoodEntrySummary';

interface Props {
  onSeeProgress: () => void;
}

/**
 * Card del mood tracker en el home. Si hoy todavía no tiene registro, deja
 * cargarlo (uno o dos colores + descripción). Una vez guardado se muestra en
 * modo lectura y se edita desde "Ver progreso".
 */
export function MoodTrackerCard({ onSeeProgress }: Props) {
  const vm = useMoodTrackerCard();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>MOOD TRACKER</Text>
          <Text style={styles.date}>{capitalize(vm.dateLabel)}</Text>
        </View>
        {vm.justSaved ? <Text style={styles.saved}>Guardado ✓</Text> : null}
      </View>

      {vm.loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : vm.savedEntry ? (
        <>
          <MoodEntrySummary entry={vm.savedEntry} />
          <Text style={styles.lockedHint}>
            Ya registraste hoy. Podés editarlo desde “Ver progreso”.
          </Text>
        </>
      ) : (
        <MoodEditor
          colors={vm.colors}
          onColorsChange={vm.setColors}
          description={vm.description}
          onDescriptionChange={vm.setDescription}
          note={vm.note}
          onNoteChange={vm.setNote}
          onSave={vm.save}
          saving={vm.saving}
          saveLabel="Guardar"
        />
      )}

      <TouchableOpacity style={styles.progressButton} onPress={onSeeProgress}>
        <Text style={styles.progressText}>Ver progreso →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9ca3af',
  },
  date: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  saved: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 13,
  },
  loader: {
    marginVertical: 24,
  },
  lockedHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressButton: {
    alignSelf: 'flex-start',
  },
  progressText: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
