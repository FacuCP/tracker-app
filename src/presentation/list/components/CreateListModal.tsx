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
import { Checkbox } from '../../components/Checkbox';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, isTodo: boolean, favorite: boolean) => Promise<void> | void;
}

/** Modal para crear una lista nueva (nombre, si es to-do list y si es favorita). */
export function CreateListModal({ visible, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [isTodo, setIsTodo] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setIsTodo(false);
      setFavorite(false);
      setSaving(false);
    }
  }, [visible]);

  async function submit() {
    if (name.trim().length === 0) return;
    setSaving(true);
    try {
      await onCreate(name, isTodo, favorite);
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
          <TouchableOpacity
            style={styles.todoRow}
            onPress={() => setIsTodo((v) => !v)}
            activeOpacity={0.7}
          >
            <Checkbox checked={isTodo} onToggle={() => setIsTodo((v) => !v)} />
            <View style={styles.todoTexts}>
              <Text style={styles.todoLabel}>Hacerla una to-do list</Text>
              <Text style={styles.todoHint}>Las entradas se marcan como completadas</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.todoRow}
            onPress={() => setFavorite((v) => !v)}
            activeOpacity={0.7}
          >
            <Checkbox checked={favorite} onToggle={() => setFavorite((v) => !v)} />
            <View style={styles.todoTexts}>
              <Text style={styles.todoLabel}>Agregar a Favoritos</Text>
              <Text style={styles.todoHint}>Aparece en la pestaña Favoritos</Text>
            </View>
          </TouchableOpacity>
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
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todoTexts: {
    flex: 1,
    gap: 1,
  },
  todoLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  todoHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
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
