import { Check } from 'lucide-react-native';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize } from '../../../core/utils/date';
import { FavoriteStar } from '../../components/FavoriteStar';
import { useMoodTrackerCard } from '../viewmodels/useMoodTrackerCard';
import { MoodEditor } from './MoodEditor';
import { MoodEntrySummary } from './MoodEntrySummary';

interface Props {
  onSeeProgress: () => void;
  /** Se llama después de marcar/desmarcar el favorito (para refrescar la lista de arriba). */
  onFavoriteToggled?: () => void;
}

/**
 * Card del mood tracker en el home. Si hoy todavía no tiene registro, deja
 * cargarlo (uno o dos colores + descripción). Una vez guardado se muestra en
 * modo lectura (resumen), con un lápiz que vuelve a mostrar el editor
 * precargado para cambiarlo sin salir de la card — mismo patrón que los
 * trackers normales. En ese editor reabierto aparece también un tacho para
 * borrar el registro de hoy (con confirmación), al lado de "Actualizar".
 */
export function MoodTrackerCard({ onSeeProgress, onFavoriteToggled }: Props) {
  const vm = useMoodTrackerCard();
  const locked = vm.savedEntry != null && !vm.editing;

  async function toggleFavorite() {
    await vm.toggleFavorite();
    onFavoriteToggled?.();
  }

  function confirmDeleteEntry() {
    Alert.alert('Borrar registro', 'Se borrará el registro de hoy del mood tracker.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: vm.deleteEntry },
    ]);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text style={styles.kicker}>MOOD TRACKER</Text>
          <Text style={styles.date}>{capitalize(vm.dateLabel)}</Text>
        </View>
        <View style={styles.headerRight}>
          <FavoriteStar favorite={vm.favorite} onToggle={toggleFavorite} />
          {vm.justSaved ? <Text style={styles.saved}>Guardado ✓</Text> : null}
        </View>
      </View>

      {vm.loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : locked && vm.savedEntry ? (
        <>
          <MoodEntrySummary entry={vm.savedEntry} onEdit={vm.openEdit} />
          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={onSeeProgress}>
              <Text style={styles.progressText}>Ver progreso →</Text>
            </TouchableOpacity>
            <View style={styles.registeredBadge}>
              <Check size={14} color="#16a34a" strokeWidth={3} />
              <Text style={styles.registeredText}>Registrado hoy</Text>
            </View>
          </View>
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
          saveLabel={vm.savedEntry ? 'Actualizar' : 'Guardar'}
          onDelete={vm.savedEntry ? confirmDeleteEntry : undefined}
          leftAction={
            <TouchableOpacity onPress={onSeeProgress}>
              <Text style={styles.progressText}>Ver progreso →</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8f9fc',
    borderRadius: 16,
    padding: 14,
    gap: 10,
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
  headerTexts: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9ca3af',
  },
  date: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  saved: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 13,
  },
  loader: {
    marginVertical: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  registeredText: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 13,
  },
});
