import { Reply } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { formatTime } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { NoteMessage } from '../../../domain/note/entities/NoteMessage';
import { Checkbox } from '../../components/Checkbox';
import { LinkedText } from '../../components/LinkedText';

/** Mismos umbrales que el resto de los swipes de la app (carrusel, calendarios), para que el gesto se sienta igual. */
const CLAIM_THRESHOLD = 18;
const FAIL_OFFSET_Y = 10;
const COMMIT_THRESHOLD = 45;
const MAX_DRAG = 56;

interface Props {
  message: NoteMessage;
  /** `undefined` = no responde a nada; `null` = respondía a un mensaje ya borrado; si no, el mensaje citado. */
  repliedMessage?: NoteMessage | null;
  selectionMode: boolean;
  selected: boolean;
  onLongPress: () => void;
  onToggleSelected: () => void;
  /**
   * Solo se pasa en el chat completo — la card compacta no la pasa, y sin
   * ella no hay gesto de swipe (no tiene sentido responder desde la
   * vista recortada).
   */
  onSwipeReply?: (message: NoteMessage) => void;
}

/**
 * Un mensaje del chat de una anotación: cita del mensaje al que responde (si
 * corresponde), texto (con links tocables vía `LinkedText`) y hora (+
 * "editado" si se editó). Deslizar hacia la derecha (si `onSwipeReply` está)
 * dispara la respuesta al soltar pasado el umbral; la burbuja siempre vuelve
 * a su lugar al soltar, responda o no. Mantener presionado entra en modo
 * selección (lo resuelve quien usa esto, vía `onLongPress`); con selección
 * activa, tocar cualquier mensaje lo agrega/saca de la selección.
 */
export function NoteMessageBubble({
  message,
  repliedMessage,
  selectionMode,
  selected,
  onLongPress,
  onToggleSelected,
  onSwipeReply,
}: Props) {
  // JS, no `Animated`: esta app ya tuvo dos bugs de producción por mezclar
  // `Animated` con el driver nativo bajo la Nueva Arquitectura (#110/#111,
  // en `PersistentScrollView`) — para el arrastre de una sola fila, estado
  // común alcanza de sobra y evita esa clase de problema por completo.
  const [dragX, setDragX] = useState(0);

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

  const bubble = (
    <View style={[styles.bubble, selected && styles.bubbleSelected, { transform: [{ translateX: dragX }] }]}>
      {message.replyToId !== undefined ? (
        <View style={styles.replyQuote}>
          <Text style={styles.replyQuoteText} numberOfLines={1}>
            {repliedMessage ? repliedMessage.text : 'Mensaje eliminado'}
          </Text>
        </View>
      ) : null}
      <LinkedText text={message.text} style={styles.text} />
      <View style={styles.meta}>
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
