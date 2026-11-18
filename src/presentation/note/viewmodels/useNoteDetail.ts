import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { container } from '../../../core/di/container';
import { generateId } from '../../../core/utils/id';
import { Note } from '../../../domain/note/entities/Note';
import { NoteMessage, createNoteMessage, noteMessagePreviewText } from '../../../domain/note/entities/NoteMessage';
import { PickedNoteMedia } from '../pickNoteMedia';

/**
 * ViewModel del chat de una anotación: sus mensajes, mandar uno nuevo (o
 * responder a otro, o editar uno existente) y la selección múltiple
 * (mantener presionado) para borrar, copiar o cambiar a qué anotaciones
 * pertenecen.
 */
export function useNoteDetail(noteId: string) {
  const [note, setNote] = useState<Note | null>(null);
  const [messages, setMessages] = useState<NoteMessage[]>([]);
  const [loading, setLoading] = useState(true);
  // Mensajes citados (`replyToId`) que ya no están entre los de esta
  // anotación porque se los sacó de acá, pero siguen existiendo en otra —
  // se resuelven aparte para no mostrarlos como "Mensaje eliminado" sin
  // estarlo. `null` = se confirmó que no existe en ningún lado.
  const [externalReplyTargets, setExternalReplyTargets] = useState<Record<string, NoteMessage | null>>({});

  const [draftText, setDraftText] = useState('');
  // Responder y editar son mutuamente excluyentes — arrancar uno limpia el otro.
  const [replyTarget, setReplyTarget] = useState<NoteMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<NoteMessage | null>(null);

  // Selección múltiple (mantener presionado un mensaje), mismo patrón que
  // `useListDetail`.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToNoteOpen, setAddToNoteOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  // Búsqueda de mensajes dentro de la anotación (mutuamente excluyente con
  // la selección: abrir una cierra/limpia la otra).
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const reload = useCallback(async () => {
    const [n, m] = await Promise.all([
      container.getNote.execute(noteId),
      container.getNoteMessages.execute(noteId),
    ]);
    setNote(n);
    setMessages(m);
    setLoading(false);

    const localIds = new Set(m.map((msg) => msg.id));
    const missingReplyIds = [
      ...new Set(m.map((msg) => msg.replyToId).filter((id): id is string => id != null && !localIds.has(id))),
    ];
    if (missingReplyIds.length === 0) {
      setExternalReplyTargets({});
      return;
    }
    const resolved = await Promise.all(missingReplyIds.map((id) => container.getNoteMessage.execute(id)));
    const map: Record<string, NoteMessage | null> = {};
    missingReplyIds.forEach((id, index) => {
      map[id] = resolved[index];
    });
    setExternalReplyTargets(map);
  }, [noteId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      reload().catch(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [reload]),
  );

  /**
   * El mensaje al que responde `message`, sin importar si sigue entre los
   * mensajes de esta anotación o se lo sacó de acá (y sigue en otra) —
   * `undefined` si no responde a nada, `null` si se confirmó que no existe
   * en ningún lado.
   */
  const getRepliedMessage = useCallback(
    (message: NoteMessage): NoteMessage | null | undefined => {
      if (message.replyToId === undefined) return undefined;
      const local = messages.find((m) => m.id === message.replyToId);
      if (local) return local;
      return externalReplyTargets[message.replyToId] ?? null;
    },
    [messages, externalReplyTargets],
  );

  const setReply = useCallback((message: NoteMessage) => {
    setReplyTarget(message);
    setEditingMessage(null);
  }, []);

  const cancelReply = useCallback(() => setReplyTarget(null), []);

  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
    setDraftText('');
  }, []);

  const startSelection = useCallback((messageId: string) => {
    // Vibración corta al entrar en selección (mantener presionado un mensaje).
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSearchOpen(false);
    setSearchQuery('');
    setSelectedIds(new Set([messageId]));
  }, []);

  const toggleSelected = useCallback((messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openSearch = useCallback(() => {
    setSelectedIds(new Set());
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  // Solo tiene sentido llamarla cuando hay exactamente un mensaje seleccionado.
  const startEditingSelected = useCallback(() => {
    const [id] = selectedIds;
    const message = messages.find((m) => m.id === id);
    if (!message) return;
    setEditingMessage(message);
    setDraftText(message.text);
    setReplyTarget(null);
    setSelectedIds(new Set());
  }, [selectedIds, messages]);

  const deleteSelected = useCallback(async () => {
    // Uno por vez, no `Promise.all` — mismo motivo que `useListDetail`/#91:
    // el data source hace lectura-modificación-escritura sobre el mismo
    // blob, y en paralelo dos borrados se pisan entre sí.
    for (const id of selectedIds) {
      await container.deleteNoteMessage.execute(id);
    }
    setSelectedIds(new Set());
    await reload();
  }, [selectedIds, reload]);

  const copySelectedText = useCallback(() => {
    return messages
      .filter((m) => selectedIds.has(m.id))
      .slice()
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
      .map(noteMessagePreviewText)
      .join('\n');
  }, [messages, selectedIds]);

  const openAddToNote = useCallback(() => setAddToNoteOpen(true), []);
  const closeAddToNote = useCallback(() => setAddToNoteOpen(false), []);

  /**
   * Aplica los cambios del modal de "Anotaciones": agrega los mensajes
   * seleccionados a `addIds` y los saca de `removeIds`. Un mensaje que
   * quedaría sin ninguna anotación NO se toca (se borra, no se deja vacío) —
   * devuelve cuántos fueron así para que la pantalla avise. Uno por vez, no
   * en paralelo: mismo motivo que `deleteSelected`.
   */
  const applyNoteMembership = useCallback(
    async (addIds: string[], removeIds: string[]): Promise<number> => {
      let skipped = 0;
      for (const id of [...selectedIds]) {
        const message = messages.find((m) => m.id === id);
        if (!message) continue;
        const next = [...new Set([...message.noteIds, ...addIds])].filter((n) => !removeIds.includes(n));
        if (next.length === 0) {
          skipped += 1;
          continue;
        }
        const same = next.length === message.noteIds.length && next.every((n) => message.noteIds.includes(n));
        if (same) continue;
        await container.setNoteMessageNotes.execute(id, next);
      }
      setSelectedIds(new Set());
      setAddToNoteOpen(false);
      await reload();
      return skipped;
    },
    [selectedIds, messages, reload],
  );

  const selectedMessages = messages.filter((m) => selectedIds.has(m.id));

  /** Si todos los seleccionados ya son favoritos los desmarca; si no, marca a todos. */
  const toggleFavoriteSelected = useCallback(async () => {
    const selected = messages.filter((m) => selectedIds.has(m.id));
    if (selected.length === 0) return;
    const next = !selected.every((m) => m.favorite);
    setMessages((prev) => prev.map((m) => (selectedIds.has(m.id) ? { ...m, favorite: next } : m)));
    setSelectedIds(new Set());
    for (const m of selected) {
      await container.setNoteMessageFavorite.execute(m.id, next);
    }
  }, [messages, selectedIds]);

  // Optimista: actualiza `messages` al toque, antes de que termine de
  // guardarse — nada de esperar un `await` (ni, mucho menos, un `reload()`
  // completo después) para que el mensaje aparezca. El guardado real sigue
  // en marcha atrás (`saveNoteMessage.execute`, con el mismo `id` que ya se
  // usó acá, así que es el mismo registro, no uno duplicado); si llegara a
  // fallar (prácticamente no pasa, es solo almacenamiento local), el
  // próximo `reload()` natural de la pantalla lo corrige solo. Mismo
  // criterio que ya usa `ListCard.toggleEntryDone`.
  const sendMessage = useCallback(() => {
    const text = draftText.trim();
    if (!text) return;

    if (editingMessage) {
      // Editar texto no toca `noteIds` — eso es cosa de `SetNoteMessageNotes`.
      const updated = createNoteMessage({
        id: editingMessage.id,
        noteIds: editingMessage.noteIds,
        text,
        sentAt: editingMessage.sentAt,
        replyToId: editingMessage.replyToId,
        editedAt: new Date().toISOString(),
        favorite: editingMessage.favorite,
      });
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setDraftText('');
      setEditingMessage(null);
      container.saveNoteMessage
        .execute({
          id: updated.id,
          noteIds: [...updated.noteIds],
          text: updated.text,
          sentAt: updated.sentAt,
          replyToId: updated.replyToId,
          editedAt: updated.editedAt,
          favorite: updated.favorite,
        })
        .catch(() => {});
      return;
    }

    const message = createNoteMessage({
      id: generateId(),
      noteIds: [noteId],
      text,
      sentAt: new Date().toISOString(),
      replyToId: replyTarget?.id,
    });
    setMessages((prev) => [...prev, message]);
    setDraftText('');
    setReplyTarget(null);
    container.saveNoteMessage
      .execute({
        id: message.id,
        noteIds: [...message.noteIds],
        text: message.text,
        sentAt: message.sentAt,
        replyToId: message.replyToId,
      })
      .catch(() => {});
  }, [draftText, editingMessage, replyTarget, noteId]);

  const openAttach = useCallback(() => setAttachOpen(true), []);
  const closeAttach = useCallback(() => setAttachOpen(false), []);

  /**
   * Un mensaje nuevo por cada archivo ya elegido y copiado (ver
   * `pickNoteMedia.ts`). Optimista como `sendMessage`: todos aparecen en
   * `messages` de una, antes de guardar nada. El guardado real, en cambio,
   * **no** puede ir todo en paralelo (`NoteMessageLocalDataSource.write`
   * hace lectura-modificación-escritura sobre el blob entero, no solo sobre
   * el mensaje nuevo — dos escrituras a la vez se pisan) — por eso la
   * función de fondo los guarda uno por uno, en orden, aunque la UI ya los
   * muestra a todos sin esperar nada de eso.
   */
  const sendMediaBatch = useCallback(
    (items: PickedNoteMedia[]) => {
      if (items.length === 0) return;
      const newMessages = items.map(({ kind, media, mediaItems }) =>
        createNoteMessage({
          id: generateId(),
          noteIds: [noteId],
          kind,
          media,
          mediaItems,
          sentAt: new Date().toISOString(),
        }),
      );
      setMessages((prev) => [...prev, ...newMessages]);
      (async () => {
        for (const message of newMessages) {
          await container.saveNoteMessage
            .execute({
              id: message.id,
              noteIds: [...message.noteIds],
              kind: message.kind,
              media: message.media,
              mediaItems: message.mediaItems ? [...message.mediaItems] : undefined,
              text: message.text,
              sentAt: message.sentAt,
            })
            .catch(() => {});
        }
      })();
    },
    [noteId],
  );

  const deleteNote = useCallback(async () => {
    await container.deleteNote.execute(noteId);
  }, [noteId]);

  return {
    note,
    messages,
    loading,
    draftText,
    setDraftText,
    replyTarget,
    setReply,
    cancelReply,
    editingMessage,
    cancelEditing,
    sendMessage,
    attachOpen,
    openAttach,
    closeAttach,
    sendMediaBatch,
    getRepliedMessage,
    selectedIds,
    selectionMode: selectedIds.size > 0,
    startSelection,
    toggleSelected,
    clearSelection,
    startEditingSelected,
    deleteSelected,
    copySelectedText,
    addToNoteOpen,
    openAddToNote,
    closeAddToNote,
    selectedMessages,
    applyNoteMembership,
    toggleFavoriteSelected,
    deleteNote,
    searchOpen,
    searchQuery,
    setSearchQuery,
    openSearch,
    closeSearch,
  };
}
