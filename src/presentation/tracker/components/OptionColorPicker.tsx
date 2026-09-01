import { StyleSheet, TouchableOpacity, View } from 'react-native';

/** Paleta fija de colores para las opciones de un tracker. */
export const OPTION_COLORS: readonly string[] = [
  '#22C55E', // verde
  '#E5484D', // rojo
  '#F5A623', // naranja
  '#FACC15', // amarillo
  '#3B82F6', // azul
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#14B8A6', // teal
  '#9AA0A6', // gris
  '#8B5E3C', // marrón
];

interface Props {
  value: string;
  onChange: (color: string) => void;
}

/** Fila de swatches para elegir el color de una opción. */
export function OptionColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTION_COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          onPress={() => onChange(color)}
          activeOpacity={0.7}
          style={[
            styles.swatch,
            { backgroundColor: color },
            value.toLowerCase() === color.toLowerCase() && styles.selected,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#111827',
  },
});
