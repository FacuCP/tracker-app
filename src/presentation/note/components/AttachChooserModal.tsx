import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onChoose: (what: 'photo' | 'document') => void;
}

/** Modal del clip del composer: elegir entre mandar fotos (hasta 4 juntas, en un solo mensaje) o documentos (hasta 5 por vez, uno por mensaje). */
export function AttachChooserModal({ visible, onClose, onChoose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Adjuntar</Text>
          <Text style={styles.subtitle}>Hasta 4 fotos juntas, o 5 documentos por vez</Text>

          <View style={styles.choices}>
            <TouchableOpacity style={styles.choice} onPress={() => onChoose('photo')} activeOpacity={0.85}>
              <Text style={styles.choiceText}>Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choice} onPress={() => onChoose('document')} activeOpacity={0.85}>
              <Text style={styles.choiceText}>Documento</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  choices: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  choice: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  choiceText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
});
