import { FileText, Pause, Play, Reply, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { formatTime } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { noteMediaExists, noteMediaUri, openNoteDocument } from '../../../data/note/noteMediaStorage';
import { NoteMessage, noteMessageMediaItems, noteMessagePreviewText } from '../../../domain/note/entities/NoteMessage';
import { Checkbox } from '../../components/Checkbox';
import { LinkedText } from '../../components/LinkedText';
import { ImageViewerModal } from './ImageViewerModal';
import { NoteAudioPlayer } from './NoteAudioPlayer';

/** Mismos umbrales que el resto de los swipes de la app (carrusel, calendarios), para que el gesto se sienta igual. */
const CLAIM_THRESHOLD = 18;
const FAIL_OFFSET_Y = 10;
const COMMIT_THRESHOLD = 45;
const MAX_DRAG = 56;
/** Más corto que el default de React Native (500ms) para que seleccionar se sienta ágil. */
const LONG_PRESS_DELAY = 220;

function formatFileSize(bytes?: number): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  message: NoteMessage;
  /** `undefined` = no responde a nada; `null` = respondía a un mensaje ya borrado; si no, el mensaje citado. */
  repliedMessage?: NoteMessage | null;
  selectionMode: boolean;
  selected: boolean;
  onLongPress: () => void;
  onToggleSelected: () => void;
  /** Resaltado temporal (al llegar desde la pestaña de favoritos). */
  highlighted?: boolean;
  /**
   * Solo se pasa en el chat completo — la card compacta no la pasa, y sin
   * ella no hay gesto de swipe (no tiene sentido responder desde la
   * vista recortada).
   */
  onSwipeReply?: (message: NoteMessage) => void;
}

/**
 * Un mensaje del chat de una anotación: cita del mensaje al que responde (si
 * corresponde), contenido según `message.kind` (texto con links tocables,
 * foto, documento o audio) y hora (+ "editado" si se editó). Deslizar hacia
 * la derecha (si `onSwipeReply` está) dispara la respuesta al soltar pasado
 * el umbral; la burbuja siempre vuelve a su lugar al soltar, responda o no.
 * Mantener presionado entra en modo selección (lo resuelve quien usa esto,
 * vía `onLongPress`); con selección activa, tocar cualquier mensaje lo
 * agrega/saca de la selección — y el toque propio de cada tipo de contenido
 * (ver foto, abrir documento, reproducir audio) se desactiva, para que ese
 * toque no compita con el de seleccionar.
 */
export function NoteMessageBubble({
  message,
  repliedMessage,
  selectionMode,
  selected,
  onLongPress,
  onToggleSelected,
  highlighted = false,
  onSwipeReply,
}: Props) {
  // JS, no `Animated`: esta app ya tuvo dos bugs de producción por mezclar
  // `Animated` con el driver nativo bajo la Nueva Arquitectura (#110/#111,
  // en `PersistentScrollView`) — para el arrastre de una sola fila, estado
  // común alcanza de sobra y evita esa clase de problema por completo.
  const [dragX, setDragX] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const gesture = usePanGesture({
    enabled: !selectionMode && onSwipeReply != null,
    activeOffsetX: [0, CLAIM_THRESHOLD],
    failOffsetY: [-FAIL_OFFSET_Y, FAIL_OFFSET_Y],
    onUpdate: (e) => {
      setDragX(Math.max(0, Math.min(e.translationX, MAX_DRAG)));
    },
    onDeactivate: (e) => {
      if (!e.canceled && dragX >= COMMIT_THRESHOLD) {
        onSwipeReply?.(message);
      }
      setDragX(0);
    },
  });

  const sentDate = new Date(message.sentAt);

  // Las que sí están, en orden — el índice que se le pasa al visor es la
  // posición acá (no en `mediaItems`), así "siguiente/anterior" al
  // deslizar coincide con lo que de verdad se puede ver. Vacío para
  // mensajes que no son foto.
  const existingUris =
    message.kind === 'image'
      ? noteMessageMediaItems(message)
          .filter((item) => noteMediaExists(item.fileName))
          .map((item) => noteMediaUri(item.fileName))
      : [];

  function renderContent() {
    if (message.kind === 'image') {
      const items = noteMessageMediaItems(message);
      if (items.length === 0) {
        return <Text style={styles.missingText}>Archivo no encontrado</Text>;
      }
      // Una sola foto se ve grande; dos o más forman una cuadrícula de 2
      // columnas (dos arriba, dos abajo con 4) — mismo ancho total en los
      // dos casos para que la burbuja no cambie de tamaño según la cantidad.
      return (
        <View style={items.length > 1 ? styles.imageGrid : undefined}>
          {items.map((item) => {
            const exists = noteMediaExists(item.fileName);
            const tileStyle = items.length > 1 ? styles.imageGridTile : styles.imageThumb;
            if (!exists) {
              return (
                <View key={item.fileName} style={[tileStyle, styles.imageMissingTile]}>
                  <Text style={styles.missingText}>No encontrada</Text>
                </View>
              );
            }
            const uri = noteMediaUri(item.fileName);
            const existingIndex = existingUris.indexOf(uri);
            return (
              <TouchableOpacity
                key={item.fileName}
                disabled={selectionMode}
                onPress={() => setViewerIndex(existingIndex)}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={tileStyle} resizeMode="cover" />
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    const media = message.media;
    if (message.kind === 'text' || !media) {
      return <LinkedText text={message.text} style={styles.text} />;
    }

    const exists = noteMediaExists(media.fileName);
    if (!exists) {
      return <Text style={styles.missingText}>Archivo no encontrado</Text>;
    }
    const uri = noteMediaUri(media.fileName);

    if (message.kind === 'document') {
      const size = formatFileSize(media.fileSize);
      return (
        <TouchableOpacity
          disabled={selectionMode}
          style={styles.documentRow}
          onPress={() => openNoteDocument(media.fileName, media.mimeType).catch(() => {})}
          activeOpacity={0.7}
        >
          <FileText size={22} color={theme.colors.accent} />
          <View style={styles.documentTexts}>
            <Text style={styles.documentName} numberOfLines={1}>
              {media.originalName ?? media.fileName}
            </Text>
            {size ? <Text style={styles.documentSize}>{size}</Text> : null}
          </View>
        </TouchableOpacity>
      );
    }

    return <NoteAudioPlayer uri={uri} disabled={selectionMode} />;
  }

  const bubble = (
    <View style={[styles.bubble, (selected || highlighted) && styles.bubbleSelected, { transform: [{ translateX: dragX }] }]}>
      {message.replyToId !== undefined ? (
        <View style={styles.replyQuote}>
          <Text style={styles.replyQuoteText} numberOfLines={1}>
            {repliedMessage ? noteMessagePreviewText(repliedMessage) : 'Mensaje eliminado'}
          </Text>
        </View>
      ) : null}
      {renderContent()}
      <View style={styles.meta}>
        {message.favorite ? <Star size={11} color="#f59e0b" fill="#f59e0b" /> : null}
        {message.editedAt ? <Text style={styles.edited}>editado</Text> : null}
        <Text style={styles.time}>{formatTime(sentDate)}</Text>
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={selectionMode ? onToggleSelected : undefined}
      onLongPress={onLongPress}
      delayLongPress={LONG_PRESS_DELAY}
      activeOpacity={selectionMode ? 0.6 : 1}
    >
      {selectionMode ? <Checkbox checked={selected} onToggle={onToggleSelected} /> : null}
      <View style={styles.bubbleWrap}>
        {onSwipeReply ? (
          // El `GestureDetector` envuelve toda la franja (`swipeStrip`, ancho
          // completo de `bubbleWrap`), no solo la burbuja — así el swipe se
          // puede empezar en cualquier parte de la fila, no solo tocando
          // justo donde está el globo (que además es más chico que la fila
          // por el `maxWidth` del 85%).
          <GestureDetector gesture={gesture}>
            <View style={styles.swipeStrip}>
              <View style={[styles.replyHint, { opacity: Math.min(dragX / COMMIT_THRESHOLD, 1) }]}>
                <Reply size={16} color={theme.colors.textMuted} />
              </View>
              {bubble}
            </View>
          </GestureDetector>
        ) : (
          bubble
        )}
      </View>
      <ImageViewerModal
        photos={viewerIndex != null ? existingUris : null}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  bubbleWrap: {
    flex: 1,
  },
  swipeStrip: {
    width: '100%',
  },
  replyHint: {
    position: 'absolute',
    left: -4,
    top: '50%',
    marginTop: -8,
  },
  bubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
  },
  bubbleSelected: {
    backgroundColor: '#eff6ff',
    borderColor: theme.colors.accent,
  },
  replyQuote: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.accent,
    paddingLeft: 6,
    marginBottom: 2,
  },
  replyQuoteText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  text: {
    fontSize: 15,
    color: theme.colors.text,
  },
  missingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  imageThumb: {
    width: 180,
    height: 180,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  imageGrid: {
    width: 180,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  imageGridTile: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  imageMissingTile: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 160,
    maxWidth: 220,
  },
  documentTexts: {
    flex: 1,
    gap: 1,
  },
  documentName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  documentSize: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  edited: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
