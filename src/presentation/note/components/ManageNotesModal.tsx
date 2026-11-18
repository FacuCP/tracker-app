import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { Note } from '../../../domain/note/entities/Note';
import { NoteMessage } from '../../../domain/note/entities/NoteMessage';
import { Checkbox } from '../../components/Checkbox';

interface Props {
  visible: boolean;
  /** Los mensajes seleccionados: de acá sale qué anotaciones aparecen tildadas. */
  messages: readonly NoteMessage[];
  onClose: () => void;
  /** Cambios a aplicar: a qué anotaciones se agregan los mensajes y de cuáles se sacan. */
  onSave: (addIds: string[], removeIds: string[]) => void;
}

/**
 * Un solo modal para agregar/quitar los mensajes seleccionados de
 * anotaciones (reemplaza a los dos botones separados de #135): lista TODAS
 * las anotaciones, cada una con un checkbox lleno si todos los mensajes
 * seleccionados ya pertenecen a ella y vacío si no. Tocar una fila cambia
 * el tilde; nada se guarda hasta "Guardar". Con varios mensajes
 * seleccionados, una anotación a la que pertenecen solo algunos se
 * muestra vacía — tildarla los agrega a todos.
 */
export function ManageNotesModal({ visible, messages, onClose, onSave }: Props) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;
    setNotes(null);
    container.getNotes.execute().then((all) => {
      const start = new Set(
        all
          .filter((n) => messages.length > 0 && messages.every((m) => m.noteIds.includes(n.id)))
          .map((n) => n.id),
      );
      setInitial(start);
      setChecked(new Set(start));
      setNotes(all);
    });
    // Solo al abrir: la selección no cambia mientras el modal está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggle(noteId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }

  function save() {
    const addIds = [...checked].filter((id) => !initial.has(id));
    const removeIds = [...initial].filter((id) => !checked.has(id));
    onSave(addIds, removeIds);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Anotaciones</Text>

          {notes == null ? (
            <Text style={styles.subtitle}>Cargando…</Text>
          ) : notes.length === 0 ? (
            <Text style={styles.subtitle}>No hay anotaciones.</Text>
          ) : (
            <ScrollView style={styles.list}>
              {notes.map((note) => (
                <TouchableOpacity key={note.id} style={styles.row} onPress={() => toggle(note.id)} activeOpacity={0.7}>
                  <Checkbox checked={checked.has(note.id)} onToggle={() => toggle(note.id)} />
                  <Text style={styles.rowText} numberOfLines={1}>
                    {note.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={save} disabled={notes == null}>
              <Text style={styles.saveText}>Guardar</Text>
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
    gap: 10,
    maxHeight: '70%',
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
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  saveText: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
});
