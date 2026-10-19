import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { theme } from '../../core/theme';
import { LinkedText } from './LinkedText';

interface Props {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  /** Contenido extra entre el título y la descripción (ej. series × peso de un ejercicio). */
  children?: ReactNode;
}

/**
 * Modal genérico de solo lectura para mostrar la descripción de algo (una
 * tarea, una entrada de lista, un ejercicio...), con links tocables. Lo abre
 * el botón "i" que aparece al lado del título cuando hay descripción.
 */
export function InfoModal({ visible, title, description, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          {children}
          {description ? (
            <ScrollView style={styles.descriptionBox}>
              <LinkedText text={description} style={styles.description} />
            </ScrollView>
          ) : null}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  descriptionBox: {
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  closeButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
