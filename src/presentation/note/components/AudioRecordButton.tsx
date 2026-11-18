import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Mic } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { theme } from '../../../core/theme';
import { copyIntoNoteMedia } from '../../../data/note/noteMediaStorage';
import { NoteMessageMedia } from '../../../domain/note/entities/NoteMessage';

/** Cuánto hay que mantener presionado (sin soltar) para que arranque a grabar — filtra toques cortos por error. */
const HOLD_TO_START_MS = 150;
/** Cuánto hay que deslizar a la izquierda, en puntos, para que soltar cancele en vez de mandar. */
const CANCEL_THRESHOLD = 90;

function formatSeconds(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  /** Se llama en cuanto arranca a grabar y en cuanto termina (soltar o cancelar) — quien lo use oculta el campo de texto mientras tanto. */
  onRecordingChange: (recording: boolean) => void;
  /** Se llama solo si se grabó algo y no se canceló — ya viene copiado a la carpeta de medios, listo para mandar. */
  onSendAudio: (media: NoteMessageMedia) => void;
}

/**
 * Botón de micrófono: mantenerlo presionado graba un audio (estilo
 * WhatsApp, sin traba todavía — ver plan de la sesión, #137). Soltar normal
 * manda el audio grabado; deslizar a la izquierda más de
 * `CANCEL_THRESHOLD` y soltar lo descarta sin mandar nada. Un solo gesto de
 * arrastre (`usePanGesture`, mismo que ya usa esta app para el swipe de
 * responder y el tirador del panel flotante) con `activateAfterLongPress`
 * en vez de componer un gesto de mantener presionado aparte — más simple y
 * menos nuevo para este código base. Estado común (`useState`), nunca
 * `Animated`, mismo criterio que el resto de los gestos de esta app.
 *
 * Se mantiene montado siempre (lo decide quien lo usa, en base a si hay
 * texto escrito) para que el gesto no se corte a mitad de un toque por un
 * remount — adentro, cambia de verse como un simple ícono a ocupar toda la
 * fila con el estado de grabación en curso.
 */
export function AudioRecordButton({ onRecordingChange, onSendAudio }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [isRecording, setIsRecording] = useState(false);
  const [dragX, setDragX] = useState(0);
  // Evita que una grabación arranque después de que el dedo ya se soltó
  // (el permiso de micrófono es un `await` — el usuario puede soltar
  // mientras el diálogo del sistema todavía está en pantalla).
  const activeRef = useRef(false);

  async function startRecording() {
    activeRef.current = true;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso necesario', 'Hace falta permiso de micrófono para grabar audio.');
        activeRef.current = false;
        return;
      }
      if (!activeRef.current) return; // se soltó mientras se esperaba el permiso
      await recorder.prepareToRecordAsync();
      if (!activeRef.current) return;
      recorder.record();
      setIsRecording(true);
      onRecordingChange(true);
    } catch {
      activeRef.current = false;
    }
  }

  async function finishRecording(canceled: boolean) {
    const wasActive = activeRef.current;
    activeRef.current = false;
    setIsRecording(false);
    onRecordingChange(false);
    setDragX(0);
    if (!wasActive || !recorderState.isRecording) return;

    const durationMillis = recorderState.durationMillis;
    await recorder.stop().catch(() => {});
    const uri = recorder.uri;
    if (canceled || !uri) return;

    try {
      const fileName = await copyIntoNoteMedia(uri, `audio-${Date.now()}.m4a`);
      onSendAudio({ fileName, mimeType: 'audio/m4a', durationMillis });
    } catch {
      // Si falla copiar el archivo, no hay nada para mandar — se pierde esa
      // grabación puntual, no rompe el chat.
    }
  }

  const gesture = usePanGesture({
    activateAfterLongPress: HOLD_TO_START_MS,
    onActivate: () => {
      startRecording();
    },
    onUpdate: (e) => {
      setDragX(Math.min(0, e.translationX));
    },
    onDeactivate: (e) => {
      const canceled = e.canceled || dragX <= -CANCEL_THRESHOLD;
      finishRecording(canceled);
    },
    onFinalize: () => {
      // Red de seguridad: si por lo que sea nunca llegó `onDeactivate`
      // (por ejemplo, el gesto nunca activó porque fue un toque corto),
      // esto no hace nada nuevo — `activeRef` ya está en `false`.
      if (activeRef.current) finishRecording(true);
    },
  });

  // Apaga el recorder si el componente se desmonta a mitad de una grabación
  // (pantalla cerrada de golpe) — mejor esfuerzo, sin bloquear nada.
  useEffect(() => {
    return () => {
      if (recorderState.isRecording) recorder.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelProgress = Math.min(1, -dragX / CANCEL_THRESHOLD);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.wrap, isRecording && styles.wrapRecording]}>
        {isRecording ? (
          <View style={styles.recordingRow}>
            <View style={styles.dot} />
            <Text style={styles.timeText}>{formatSeconds(recorderState.durationMillis)}</Text>
            <Text style={[styles.cancelHint, { opacity: 1 - cancelProgress * 0.6 }]}>‹ Deslizá para cancelar</Text>
          </View>
        ) : null}
        <View style={[styles.micButton, { transform: [{ translateX: Math.max(dragX, -40) }] }]}>
          <Mic size={18} color="#fff" />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  wrapRecording: {
    flex: 1,
    justifyContent: 'space-between',
  },
  recordingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  timeText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '600',
  },
  cancelHint: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
