import { StyleSheet, Text, View } from 'react-native';

import {
  getMoodColorInfo,
  MOOD_COLOR_DISPLAY_ORDER,
  MoodColorCounts,
} from '../../../domain/mood/entities/MoodColor';

interface Props {
  /** Cuántas veces ocurrió cada color en el período que se está mostrando. */
  counts: MoodColorCounts;
}

/**
 * Referencias de colores como cards: color, emoción y cuántas veces apareció
 * en el período visible. El orden es fijo (ver MOOD_COLOR_DISPLAY_ORDER): el
 * primero va solo en su fila y el resto de a pares.
 */
export function MoodReferenceCards({ counts }: Props) {
  const [firstColor, ...restColors] = MOOD_COLOR_DISPLAY_ORDER;

  return (
    <View style={styles.grid}>
      <ReferenceCard color={firstColor} count={counts[firstColor]} fullWidth />
      {restColors.map((color) => (
        <ReferenceCard key={color} color={color} count={counts[color]} />
      ))}
    </View>
  );
}

function ReferenceCard({
  color,
  count,
  fullWidth = false,
}: {
  color: (typeof MOOD_COLOR_DISPLAY_ORDER)[number];
  count: number;
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
        <Text style={styles.count}>{count}</Text>
      </View>
      <Text style={styles.name}>{info.name}</Text>
      <Text style={styles.meaning}>{info.meaning}</Text>
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
    backgroundColor: '#fff',
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
});
