import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
  onPress: () => void;
}

/** Botón que abre el formulario para crear un tracker nuevo. */
export function CreateTrackerButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.text}>＋ Crear tracker nuevo</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9ca3af',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: {
    color: '#374151',
    fontWeight: '800',
    fontSize: 15,
  },
});
