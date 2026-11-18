import { Send } from 'lucide-react-native';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { generateId } from '../../../core/utils/id';
import { theme } from '../../../core/theme';
import { Note } from '../../../domain/note/entities/Note';
import { NoteMessage, createNoteMessage } from '../../../domain/note/entities/NoteMessage';
import { FavoriteStar } from '../../components/FavoriteStar';
import { PersistentScrollView } from '../../components/PersistentScrollView';
import { useFocusOnOpen } from '../../components/useFocusOnOpen';
import { FloatingOverlay } from '../../components/useFloatingOverlay';
import { buildNoteTimeline } from '../groupMessagesByDay';
import { PickedNoteMedia, pickNoteDocuments, pickNotePhotos } from '../pickNoteMedia';
import { AttachChooserModal } from './AttachChooserModal';
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
  const [externalReplyTargets, setExternalReplyTargets] = useState<Record<string, NoteMessage | null>>({});
  const [draftText, setDraftText] = useState('');
  const [replyTarget, setReplyTarget] = useState<NoteMessage | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [attachOpen, setAttachOpen] = useState(false);
  const composerInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const overlayKey = `note-${note.id}`;
  const isOpen = overlay.isOpen(overlayKey);

  useEffect(() => {
    let active = true;
    container.getNoteMessages.execute(note.id).then(async (result) => {
      if (!active) return;
      setMessages(result);

      // Igual que en `useNoteDetail`: una cita puede apuntar a un mensaje
      // que ya no está en ESTA anotación (se lo sacó, pero sigue en otra) —
      // se resuelve aparte para no mostrarlo como "Mensaje eliminado".
      const localIds = new Set(result.map((m) => m.id));
      const missingReplyIds = [
        ...new Set(result.map((m) => m.replyToId).filter((id): id is string => id != null && !localIds.has(id))),
      ];
      if (missingReplyIds.length === 0) {
        setExternalReplyTargets({});
        return;
      }
      const resolved = await Promise.all(missingReplyIds.map((id) => container.getNoteMessage.execute(id)));
      if (!active) return;
      const map: Record<string, NoteMessage | null> = {};
      missingReplyIds.forEach((id, index) => {
        map[id] = resolved[index];
      });
      setExternalReplyTargets(map);
    });
    return () => {
      active = false;
    };
  }, [note.id, reloadTick]);

  // Optimista: actualiza `messages` al toque, antes de que termine de
  // guardarse — sin esperar ningún `await` ni volver a pedir los mensajes
  // enteros después (eso eran dos vueltas completas a AsyncStorage de más).
  // El guardado real sigue atrás con el mismo `id` que ya se usó acá, así
  // que es el mismo registro, no uno duplicado; si llegara a fallar (en la
  // práctica no pasa, es solo almacenamiento local), el próximo `reloadTick`
  // lo corrige solo. Mismo criterio que ya usa `ListCard.toggleEntryDone`.
  function send() {
    const text = draftText.trim();
    if (!text) return;
    const message = createNoteMessage({
      id: generateId(),
      noteIds: [note.id],
      text,
      sentAt: new Date().toISOString(),
      replyToId: replyTarget?.id,
    });
    setMessages((prev) => [...(prev ?? []), message]);
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
  }

  // Mismo criterio optimista que `send()`, pero para los mensajes de medios
  // elegidos de una (ver `pickNoteMedia.ts`): todos aparecen de una en
  // `messages`; el guardado real de cada uno va uno por vez, en orden
  // (nunca en paralelo — mismo motivo que `useNoteDetail.sendMediaBatch`).
  function sendMediaBatch(items: PickedNoteMedia[]) {
    if (items.length === 0) return;
    const newMessages = items.map(({ kind, media, mediaItems }) =>
      createNoteMessage({
        id: generateId(),
        noteIds: [note.id],
        kind,
        media,
        mediaItems,
        sentAt: new Date().toISOString(),
      }),
    );
    setMessages((prev) => [...(prev ?? []), ...newMessages]);
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
  }

  async function chooseAttach(what: 'photo' | 'document') {
    setAttachOpen(false);
    try {
      const items = what === 'photo' ? await pickNotePhotos() : await pickNoteDocuments();
      sendMediaBatch(items);
    } catch (error) {
      Alert.alert('No se pudo adjuntar', error instanceof Error ? error.message : 'Ocurrió un error');
    }
  }

  const timeline = messages ? buildNoteTimeline(messages) : [];

  function getRepliedMessage(message: NoteMessage): NoteMessage | null | undefined {
    if (message.replyToId === undefined) return undefined;
    const local = (messages ?? []).find((m) => m.id === message.replyToId);
    if (local) return local;
    return externalReplyTargets[message.replyToId] ?? null;
  }

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
          repliedMessage={getRepliedMessage(entry.message)}
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
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onAttach={() => setAttachOpen(true)}
          onSendAudio={(media) => sendMediaBatch([{ kind: 'audio', media }])}
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
  }, [isOpen, draftText, replyTarget, messages]);

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
        <View style={styles.headerTexts}>
          <Text style={styles.name} numberOfLines={1}>
            {note.name}
          </Text>
          {note.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {note.description}
            </Text>
          ) : null}
        </View>
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

      <AttachChooserModal visible={attachOpen} onClose={() => setAttachOpen(false)} onChoose={chooseAttach} />
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
  headerTexts: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  description: {
    fontSize: 12,
    color: theme.colors.textMuted,
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
