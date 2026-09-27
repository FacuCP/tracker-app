import { StyleSheet, Text, View } from 'react-native';

import { capitalize, MONTHS_ES } from '../../../core/utils/date';
import {
  getMoodColorInfo,
  MOOD_COLOR_DISPLAY_ORDER,
  MoodColor,
  MoodColorCounts,
} from '../../../domain/mood/entities/MoodColor';
import { MoodTopMonthByColor } from '../../../domain/mood/usecases/GetMoodRange';

interface Props {
  /** Cuántas veces ocurrió cada color en el período (un día con 2 colores suma 0.5 a c/u). */
  counts: MoodColorCounts;
  /** Si viene (vista Año), cada card muestra el mes con más ocurrencias del color. */
  topMonthByColor?: MoodTopMonthByColor | null;
}

/**
 * Referencias de colores como cards: color, emoción y cuántas veces apareció en
 * el período. Se ordenan por cantidad (de mayor a menor); el primero va solo en
 * su fila y el resto de a pares.
 */
export function MoodReferenceCards({ counts, topMonthByColor }: Props) {
  const displayIndex = (color: MoodColor) => MOOD_COLOR_DISPLAY_ORDER.indexOf(color);
  const sorted = [...MOOD_COLOR_DISPLAY_ORDER].sort(
    (a, b) => counts[b] - counts[a] || displayIndex(a) - displayIndex(b),
  );
  const [firstColor, ...restColors] = sorted;

  return (
    <View style={styles.grid}>
      <ReferenceCard
        color={firstColor}
        count={counts[firstColor]}
        topMonth={topMonthByColor?.[firstColor] ?? null}
        fullWidth
      />
      {restColors.map((color) => (
        <ReferenceCard
          key={color}
          color={color}
          count={counts[color]}
          topMonth={topMonthByColor?.[color] ?? null}
        />
      ))}
    </View>
  );
}

function ReferenceCard({
  color,
  count,
  topMonth,
  fullWidth = false,
}: {
  color: MoodColor;
  count: number;
  topMonth: number | null;
  fullWidth?: boolean;
}) {
  const info = getMoodColorInfo(color);
  return (
    <View
      style={[
        styles.card,
        fullWidth ? styles.cardFull : styles.cardHalf,
        count === 0 && styles.cardMuted,
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.swatch, { backgroundColor: info.hex }]} />
        <Text style={styles.count}>{String(count)}</Text>
      </View>
      <Text style={styles.name}>{info.name}</Text>
      <Text style={styles.meaning}>{info.meaning}</Text>
      {topMonth != null && count > 0 ? (
        <Text style={styles.topMonth}>Más en {capitalize(MONTHS_ES[topMonth])}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    backgroundColor: '#f8f9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef0f2',
    padding: 12,
    gap: 2,
  },
  cardFull: {
    width: '100%',
  },
  cardHalf: {
    width: '47.5%',
    flexGrow: 1,
  },
  cardMuted: {
    opacity: 0.5,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  count: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  meaning: {
    fontSize: 12,
    color: '#6b7280',
  },
  topMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 2,
  },
});
