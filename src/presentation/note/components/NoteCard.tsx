import { Send } from 'lucide-react-native';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { Note } from '../../../domain/note/entities/Note';
import { NoteMessage } from '../../../domain/note/entities/NoteMessage';
import { FavoriteStar } from '../../components/FavoriteStar';
import { PersistentScrollView } from '../../components/PersistentScrollView';
import { useFocusOnOpen } from '../../components/useFocusOnOpen';
import { FloatingOverlay } from '../../components/useFloatingOverlay';
import { buildNoteTimeline } from '../groupMessagesByDay';
import { NoteComposer } from './NoteComposer';
import { NoteDaySeparator } from './NoteDaySeparator';
import { NoteMessageBubble } from './NoteMessageBubble';

interface Props {
  note: Note;
  onToggleFavorite: () => void;
  onOpen: () => void;
  /** Solo en Favoritos: recorte más bajo. */
  compact?: boolean;
  /** Se suma 1 en cada recarga de la pantalla que contiene la card — mismo patrón que `ListCard`. */
  reloadTick?: number;
  /**
   * Panel flotante compartido por toda la pantalla (ver
   * `useFloatingOverlay`) — acá se empuja el chat+composer en vez de abrir
   * un `Modal` propio: uno por card terminaba comiéndose el primer toque
   * sobre el botón de enviar (ver #131).
   */
  overlay: FloatingOverlay;
}

const PREVIEW_HEIGHT = 220;
const PREVIEW_HEIGHT_COMPACT = 170;
const PANEL_PREVIEW_HEIGHT = 130;
const PANEL_HEIGHT_PERCENT = 35;

/**
 * Card de una anotación: nombre arriba (tocarlo entra al chat completo),
 * una vista recortada de **tamaño fijo** del chat (unos cuantos mensajes o
 * ninguno — nunca crece, siempre scrollea con `PersistentScrollView`,
 * arrancando y quedando pegada abajo, en el último mensaje) y abajo, en vez
 * del campo de escribir real, una vista "de mentira" con la misma pinta
 * (muestra lo escrito o el placeholder) — tocarla empuja el chat+composer
 * de verdad al panel flotante compartido de la pantalla (`overlay`), arriba
 * del teclado. El triángulo (mismo patrón que `ListCard`) colapsa/despliega
 * solo la vista principal del chat — el nombre y el campo siguen siempre
 * visibles, colapsada o no. Sin selección múltiple acá: eso vive en el chat
 * completo.
 */
export function NoteCard({ note, onToggleFavorite, onOpen, compact = false, reloadTick, overlay }: Props) {
  const [messages, setMessages] = useState<NoteMessage[] | null>(null);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<NoteMessage | null>(null);
  const [expanded, setExpanded] = useState(true);
  const composerInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const overlayKey = `note-${note.id}`;
  const isOpen = overlay.isOpen(overlayKey);

  useEffect(() => {
    let active = true;
    container.getNoteMessages.execute(note.id).then((result) => {
      if (active) setMessages(result);
    });
    return () => {
      active = false;
    };
  }, [note.id, reloadTick]);

  async function send() {
    const text = draftText.trim();
    if (!text) return;
    setSending(true);
    try {
      await container.saveNoteMessage.execute({
        noteId: note.id,
        text,
        sentAt: new Date().toISOString(),
        replyToId: replyTarget?.id,
      });
      setDraftText('');
      setReplyTarget(null);
      setMessages(await container.getNoteMessages.execute(note.id));
    } finally {
      setSending(false);
    }
  }

  const timeline = messages ? buildNoteTimeline(messages) : [];
  const byId = new Map((messages ?? []).map((m) => [m.id, m]));

  function renderMessages() {
    if (messages == null) return <ActivityIndicator style={styles.loader} />;
    if (timeline.length === 0) return <Text style={styles.emptyText}>Sin mensajes todavía.</Text>;
    return timeline.map((entry) =>
      entry.kind === 'separator' ? (
        <NoteDaySeparator key={entry.key} date={entry.date} />
      ) : (
        <NoteMessageBubble
          key={entry.key}
          message={entry.message}
          repliedMessage={
            entry.message.replyToId !== undefined ? byId.get(entry.message.replyToId) ?? null : undefined
          }
          selectionMode={false}
          selected={false}
          onLongPress={() => {}}
          onToggleSelected={() => {}}
          onSwipeReply={startReply}
        />
      ),
    );
  }

  function panelContent() {
    return (
      <View style={styles.panelContent}>
        <PersistentScrollView
          style={styles.panelPreview}
          contentContainerStyle={styles.previewContent}
          stickToBottom
          nestedScrollEnabled
        >
          {renderMessages()}
        </PersistentScrollView>

        <NoteComposer
          ref={composerInputRef}
          value={draftText}
          onChangeText={setDraftText}
          onSend={send}
          sending={sending}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
        />
      </View>
    );
  }

  // Mantiene el panel actualizado mientras es el que está abierto (nuevos
  // mensajes, texto escrito, respuesta elegida) — si otra card lo abrió
  // mientras tanto, `isOpen` da `false` acá y este efecto no hace nada.
  useEffect(() => {
    if (isOpen) overlay.update(overlayKey, panelContent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftText, sending, replyTarget, messages]);

  useFocusOnOpen(isOpen, composerInputRef);

  function openComposer() {
    overlay.open(overlayKey, panelContent(), PANEL_HEIGHT_PERCENT);
  }

  function startReply(message: NoteMessage) {
    setReplyTarget(message);
    overlay.open(overlayKey, panelContent(), PANEL_HEIGHT_PERCENT);
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={onOpen} activeOpacity={0.7}>
        <Text style={styles.name} numberOfLines={1}>
          {note.name}
        </Text>
        <FavoriteStar favorite={note.favorite} onToggle={onToggleFavorite} />
        <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          <Text style={styles.expandTriangle}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded ? (
        <PersistentScrollView
          style={[styles.preview, compact && styles.previewCompact]}
          contentContainerStyle={styles.previewContent}
          nestedScrollEnabled
          stickToBottom
        >
          {renderMessages()}
        </PersistentScrollView>
      ) : null}

      <TouchableOpacity style={styles.composerPlaceholder} onPress={openComposer} activeOpacity={0.7}>
        <Text
          style={[styles.composerPlaceholderText, !draftText && styles.composerPlaceholderMuted]}
          numberOfLines={1}
        >
          {draftText || 'Escribí un mensaje'}
        </Text>
        <Send size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  expandButton: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandTriangle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  preview: {
    height: PREVIEW_HEIGHT,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  previewCompact: {
    height: PREVIEW_HEIGHT_COMPACT,
  },
  previewContent: {
    paddingVertical: 6,
  },
  loader: {
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  composerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  composerPlaceholderText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  composerPlaceholderMuted: {
    color: theme.colors.textMuted,
  },
  panelContent: {
    gap: 10,
  },
  panelPreview: {
    height: PANEL_PREVIEW_HEIGHT,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
});
