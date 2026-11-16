import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { container } from '../../../core/di/container';
import { Note } from '../../../domain/note/entities/Note';
import { NoteMessage } from '../../../domain/note/entities/NoteMessage';

/**
 * ViewModel del chat de una anotación: sus mensajes, mandar uno nuevo (o
 * responder a otro, o editar uno existente) y la selección múltiple
 * (mantener presionado) para borrar.
 */
export function useNoteDetail(noteId: string) {
  const [note, setNote] = useState<Note | null>(null);
  const [messages, setMessages] = useState<NoteMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [draftText, setDraftText] = useState('');
  // Responder y editar son mutuamente excluyentes — arrancar uno limpia el otro.
  const [replyTarget, setReplyTarget] = useState<NoteMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<NoteMessage | null>(null);

  // Selección múltiple (mantener presionado un mensaje), mismo patrón que
  // `useListDetail`.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
      await container.deleteNoteMessage.execute(noteId, id);
    }
    setSelectedIds(new Set());
    await reload();
  }, [selectedIds, noteId, reload]);

  const sendMessage = useCallback(async () => {
    const text = draftText.trim();
    if (!text) return;
    setSending(true);
    try {
      if (editingMessage) {
        await container.saveNoteMessage.execute({
          id: editingMessage.id,
          noteId,
          text,
          sentAt: editingMessage.sentAt,
          replyToId: editingMessage.replyToId,
          editedAt: new Date().toISOString(),
        });
      } else {
        await container.saveNoteMessage.execute({
          noteId,
          text,
          sentAt: new Date().toISOString(),
          replyToId: replyTarget?.id,
        });
      }
      setDraftText('');
      setReplyTarget(null);
      setEditingMessage(null);
      await reload();
    } finally {
      setSending(false);
    }
  }, [draftText, editingMessage, replyTarget, noteId, reload]);

  const deleteNote = useCallback(async () => {
    await container.deleteNote.execute(noteId);
  }, [noteId]);

  return {
    note,
    messages,
    loading,
    sending,
    draftText,
    setDraftText,
    replyTarget,
    setReply,
    cancelReply,
    editingMessage,
    cancelEditing,
    sendMessage,
    selectedIds,
    selectionMode: selectedIds.size > 0,
    startSelection,
    toggleSelected,
    clearSelection,
    startEditingSelected,
    deleteSelected,
    deleteNote,
    searchOpen,
    searchQuery,
    setSearchQuery,
    openSearch,
    closeSearch,
  };
}
