import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MAX_MOODS_PER_DAY } from '../../../domain/mood/entities/MoodEntry';
import { MOOD_COLORS, MoodColor, getMoodColorInfo, splitMoodMeaning } from '../../../domain/mood/entities/MoodColor';

interface Props {
  selected: MoodColor[];
  onChange: (selected: MoodColor[]) => void;
  /** Se agrega como un sexto ítem en la segunda fila, al costado de los últimos 4 colores — lo usa `MoodEditor` para el campo "Nota". */
  trailing?: ReactNode;
}

/** Los 9 colores se parten en dos filas fijas: 5 arriba, 4 abajo (+ `trailing`, que ocupa el 5° lugar de esa fila). */
const ROW_1_SIZE = 5;

/**
 * Grilla con los nueve colores de ánimo, en dos filas de 5 columnas iguales
 * (no un `flexWrap` que dependa del ancho disponible, para que el acomodo
 * sea siempre el mismo sin importar la pantalla). Se pueden elegir hasta
 * dos. Al tocar un tercero se reemplaza el más viejo. El número muestra el
 * orden.
 */
export function MoodColorPicker({ selected, onChange, trailing }: Props) {
  function toggle(color: MoodColor) {
    const index = selected.indexOf(color);
    if (index >= 0) {
      onChange(selected.filter((c) => c !== color));
      return;
    }
    if (selected.length < MAX_MOODS_PER_DAY) {
      onChange([...selected, color]);
    } else {
      onChange([...selected.slice(1), color]);
    }
  }

  function renderSwatch(info: (typeof MOOD_COLORS)[number]) {
    const order = selected.indexOf(info.color);
    const isSelected = order >= 0;
    return (
      <TouchableOpacity key={info.color} style={styles.item} onPress={() => toggle(info.color)} activeOpacity={0.7}>
        <View style={[styles.swatch, { backgroundColor: info.hex }, isSelected && styles.swatchSelected]}>
          {isSelected ? <Text style={styles.order}>{order + 1}</Text> : null}
        </View>
        <View style={styles.labelLines}>
          {splitMoodMeaning(info.meaning).map((word, i) => (
            <Text key={i} style={styles.label}>
              {word}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    );
  }

  const firstRow = MOOD_COLORS.slice(0, ROW_1_SIZE);
  const secondRow = MOOD_COLORS.slice(ROW_1_SIZE);

  return (
    <View style={styles.grid}>
      <View style={styles.row}>{firstRow.map(renderSwatch)}</View>
      <View style={styles.row}>
        {secondRow.map(renderSwatch)}
        {trailing}
      </View>
    </View>
  );
}

export function moodColorMeaning(color: MoodColor): string {
  return getMoodColorInfo(color).meaning;
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#111827',
  },
  order: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 2,
  },
  labelLines: {
    // Más ancho que la columna de 1/5 del swatch (que ronda los 60-65px) a
    // propósito: así entra en una línea hasta la palabra más larga del
    // dominio ("desmotivado", "emocionado", "Energizado", ~11 caracteres) y
    // nunca hace falta cortarla ni pasarla a un tercer renglón — se permite
    // que el texto exceda el ancho del círculo, centrado.
    width: 76,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
  },
});
