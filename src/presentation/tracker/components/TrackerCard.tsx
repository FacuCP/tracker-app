import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { capitalize, formatLongDate, todayIso } from '../../../core/utils/date';
import { getTrackerOption } from '../../../domain/tracker/entities/Tracker';
import { useTrackerCard } from '../viewmodels/useTrackerCard';
import { Counter } from './Counter';

interface Props {
  trackerId: string;
  onSeeProgress: () => void;
}

/** Card de un tracker del usuario en el home. */
export function TrackerCard({ trackerId, onSeeProgress }: Props) {
  const vm = useTrackerCard(trackerId);
  const tracker = vm.tracker;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <Text style={styles.name}>{tracker?.name ?? '…'}</Text>
          <Text style={styles.date}>{capitalize(formatLongDate(todayIso()))}</Text>
        </View>
        {vm.justSaved ? <Text style={styles.saved}>Guardado ✓</Text> : null}
      </View>

      {vm.loading || !tracker ? (
        <ActivityIndicator style={styles.loader} />
      ) : tracker.kind === 'options' ? (
        vm.entry ? (
          <OptionSummary
            label={getTrackerOption(tracker, vm.entry.optionId ?? '')?.label ?? '—'}
            color={getTrackerOption(tracker, vm.entry.optionId ?? '')?.color ?? '#9ca3af'}
          />
        ) : (
          <>
            <View style={styles.options}>
              {tracker.options.map((option) => {
                const selected = vm.selectedOptionId === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionChip,
                      { borderColor: option.color },
                      selected && { backgroundColor: option.color },
                    ]}
                    onPress={() => vm.selectOption(option.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!vm.selectedOptionId || vm.saving) && styles.saveButtonDisabled,
              ]}
              onPress={vm.saveOption}
              disabled={!vm.selectedOptionId || vm.saving}
            >
              {vm.saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </>
        )
      ) : (
        <View style={styles.counterRow}>
          <Counter value={vm.count} onChange={vm.setCount} />
          {vm.entry ? (
            <TouchableOpacity onPress={vm.clearEntry} style={styles.clearButton}>
              <Text style={styles.clearText}>Borrar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <TouchableOpacity onPress={onSeeProgress} style={styles.progressButton}>
        <Text style={styles.progressText}>Ver progreso →</Text>
      </TouchableOpacity>
    </View>
  );
}

function OptionSummary({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.summary}>
      <View style={[styles.summaryDot, { backgroundColor: color }]} />
      <View style={styles.summaryTexts}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryHint}>Ya registraste hoy. Editás desde “Ver progreso”.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 14,
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
    gap: 2,
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
    alignSelf: 'flex-start',
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  summaryTexts: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  summaryHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  clearText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  progressButton: {
    alignSelf: 'flex-start',
  },
  progressText: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
