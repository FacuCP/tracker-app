import { Check, Trash } from 'lucide-react-native';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize, formatLongDate, todayIso } from '../../../core/utils/date';
import { MAX_TRACKER_COMMENT } from '../../../domain/tracker/entities/TrackerEntry';
import { FavoriteStar } from '../../components/FavoriteStar';
import { FloatingTextFieldEditor } from '../../components/FloatingTextFieldEditor';
import { FloatingOverlay } from '../../components/useFloatingOverlay';
import { useTrackerCard } from '../viewmodels/useTrackerCard';
import { Counter } from './Counter';
import { TrackerOptionsSummary } from './TrackerOptionsSummary';

interface Props {
  trackerId: string;
  onSeeProgress: () => void;
  /** Se llama después de marcar/desmarcar el favorito (para refrescar la lista de arriba). */
  onFavoriteToggled?: () => void;
  /** Panel flotante compartido por toda la pantalla, ver `useFloatingOverlay`. */
  overlay: FloatingOverlay;
}

/**
 * Card de un tracker del usuario en el home. El comentario no se escribe
 * directo acá: tocar su placeholder (`FloatingTextFieldEditor`) empuja el
 * campo de verdad al panel flotante compartido de la pantalla, arriba del
 * teclado — este campo vive adentro de una card dentro de un `ScrollView`
 * largo (el home o Favoritos), donde el teclado lo tapaba igual que pasaba
 * con el campo de una anotación (ver #121/#122/#131 en `docs/DECISIONS.md`).
 */
export function TrackerCard({ trackerId, onSeeProgress, onFavoriteToggled, overlay }: Props) {
  const vm = useTrackerCard(trackerId);
  const tracker = vm.tracker;

  async function toggleFavorite() {
    await vm.toggleFavorite();
    onFavoriteToggled?.();
  }

  function confirmDeleteEntry() {
    Alert.alert('Borrar registro', 'Se borrará el registro de hoy para este tracker.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: vm.clearEntry },
    ]);
  }

  const hasOptions = (tracker?.options.length ?? 0) > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text style={styles.name}>{tracker?.name ?? '…'}</Text>
          <Text style={styles.date}>{capitalize(formatLongDate(todayIso()))}</Text>
        </View>
        <View style={styles.headerRight}>
          <FavoriteStar favorite={vm.favorite} onToggle={toggleFavorite} />
          {vm.justSaved ? <Text style={styles.saved}>Guardado ✓</Text> : null}
        </View>
      </View>

      {vm.loading || !tracker ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <>
          {hasOptions ? (
            vm.optionsLocked ? (
              <TrackerOptionsSummary
                tracker={tracker}
                optionIds={vm.entry?.optionIds ?? []}
                comment={vm.entry?.comment}
                onEdit={vm.openEditOptions}
              />
            ) : (
              <>
                <View style={styles.options}>
                  {tracker.options.map((option) => {
                    const selected = vm.selectedOptionIds.includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.optionChip,
                          { borderColor: option.color },
                          selected && { backgroundColor: option.color },
                        ]}
                        onPress={() => vm.toggleOption(option.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <FloatingTextFieldEditor
                  overlay={overlay}
                  overlayKey={`tracker-comment-${trackerId}`}
                  value={vm.commentDraft}
                  onChangeText={vm.onCommentDraftChange}
                  placeholder="Comentario (opcional)"
                  maxLength={MAX_TRACKER_COMMENT}
                />
              </>
            )
          ) : null}

          {tracker.hasCounter ? <Counter value={vm.count} onChange={vm.setCount} /> : null}
        </>
      )}

      <View style={[styles.bottomRow, hasOptions ? styles.bottomRowBetween : null]}>
        <TouchableOpacity onPress={onSeeProgress}>
          <Text style={styles.progressText}>Ver progreso →</Text>
        </TouchableOpacity>
        {hasOptions ? (
          vm.optionsLocked ? (
            <View style={styles.registeredBadge}>
              <Check size={14} color="#16a34a" strokeWidth={3} />
              <Text style={styles.registeredText}>Registrado hoy</Text>
            </View>
          ) : (
            <View style={styles.editActions}>
              {vm.entry ? (
                <TouchableOpacity onPress={confirmDeleteEntry} hitSlop={10} activeOpacity={0.6}>
                  <Trash size={20} color="#dc2626" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (vm.selectedOptionIds.length === 0 || vm.saving) && styles.saveButtonDisabled,
                ]}
                onPress={vm.saveOptions}
                disabled={vm.selectedOptionIds.length === 0 || vm.saving}
              >
                {vm.saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{vm.entry ? 'Actualizar' : 'Guardar'}</Text>
                )}
              </TouchableOpacity>
            </View>
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8f9fc',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#6b7280',
  },
  saved: {
    color: '#16a34a',
    fontWeight: '700',
    fontSize: 13,
  },
  loader: {
    marginVertical: 16,
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
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    minWidth: 110,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomRowBetween: {
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
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
