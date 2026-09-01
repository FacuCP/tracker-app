import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { theme } from '../../../core/theme';
import { MAX_LIST_NAME } from '../../../domain/list/entities/List';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void> | void;
}

/** Modal para crear una lista nueva (solo el nombre). */
export function CreateListModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setSaving(false);
    }
  }, [visible]);

  async function submit() {
    if (name.trim().length === 0) return;
    setSaving(true);
    try {
      await onCreate(name);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Nueva lista</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la lista"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={MAX_LIST_NAME}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.buttonGhost} onPress={onClose}>
              <Text style={styles.ghostText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, (name.trim().length === 0 || saving) && styles.disabled]}
              onPress={submit}
              disabled={name.trim().length === 0 || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear</Text>}
            </TouchableOpacity>
          </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoider>
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
    gap: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  buttonGhost: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  ghostText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
});
