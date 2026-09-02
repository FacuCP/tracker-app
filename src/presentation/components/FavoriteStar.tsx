import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface Props {
  favorite: boolean;
  onToggle: () => void;
  size?: number;
  style?: ViewStyle;
}

/** Botón de estrella para marcar/desmarcar algo como favorito. */
export function FavoriteStar({ favorite, onToggle, size = 22, style }: Props) {
  return (
    <TouchableOpacity onPress={onToggle} hitSlop={10} activeOpacity={0.6} style={style}>
      <Text
        style={[
          styles.star,
          { fontSize: size },
          favorite ? styles.on : styles.off,
        ]}
      >
        {favorite ? '★' : '☆'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  star: {
    fontWeight: '900',
  },
  on: {
    color: '#f59e0b',
  },
  off: {
    color: '#9ca3af',
  },
});
