import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MAX_MOODS_PER_DAY } from '../../../domain/mood/entities/MoodEntry';
import { MOOD_COLORS, MoodColor, getMoodColorInfo } from '../../../domain/mood/entities/MoodColor';

interface Props {
  selected: MoodColor[];
  onChange: (selected: MoodColor[]) => void;
}

/**
 * Grilla con los nueve colores de ánimo. Se pueden elegir hasta dos.
 * Al tocar un tercero se reemplaza el más viejo. El número muestra el orden.
 */
export function MoodColorPicker({ selected, onChange }: Props) {
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

  return (
    <View style={styles.grid}>
      {MOOD_COLORS.map((info) => {
        const order = selected.indexOf(info.color);
        const isSelected = order >= 0;
        return (
          <TouchableOpacity
            key={info.color}
            style={styles.item}
            onPress={() => toggle(info.color)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: info.hex },
                isSelected && styles.swatchSelected,
              ]}
            >
              {isSelected ? <Text style={styles.order}>{order + 1}</Text> : null}
            </View>
            <Text style={styles.name}>{info.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function moodColorMeaning(color: MoodColor): string {
  return getMoodColorInfo(color).meaning;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    width: 76,
    alignItems: 'center',
    gap: 4,
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
  name: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
  },
});
