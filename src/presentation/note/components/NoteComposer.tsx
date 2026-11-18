import { Paperclip, Send, X } from 'lucide-react-native';
import { ComponentRef, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import {
  MAX_NOTE_MESSAGE_LENGTH,
  NoteMessage,
  NoteMessageMedia,
  noteMessagePreviewText,
} from '../../../domain/note/entities/NoteMessage';
import { AudioRecordButton } from './AudioRecordButton';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Si viene, muestra la cinta "Respondiendo a: …" arriba del campo. */
  replyTarget?: NoteMessage | null;
  onCancelReply?: () => void;
  /** Si viene, muestra la cinta "Editando mensaje" en vez de la de responder (son mutuamente excluyentes). */
  editing?: boolean;
  onCancelEditing?: () => void;
  /** Si viene, muestra el clip a la izquierda del campo para mandar fotos/documentos. No se muestra mientras se edita un mensaje. */
  onAttach?: () => void;
  /** Si viene, el botón de enviar se convierte en micrófono cuando el campo está vacío (mantenerlo graba un audio). Sin esto, vacío simplemente deshabilita enviar. */
  onSendAudio?: (media: NoteMessageMedia) => void;
}

/**
 * Barra para escribir y mandar un mensaje: campo de texto + flecha de
 * enviar, con una cinta opcional arriba ("Respondiendo a…" o "Editando
 * mensaje", nunca las dos juntas) con una ✕ para cancelarla. La usan tanto
 * el chat completo como la card compacta (ahí sin responder/editar — quien
 * la usa simplemente no pasa esas props). Expone el `ref` del campo de
 * texto para que `NoteCard` pueda enfocarlo a mano cuando el panel flotante
 * termina de mostrarse (`Modal.onShow`) — un `autoFocus` normal puede
 * perder el pedido de foco si la ventana nativa todavía no está lista.
 *
 * El botón de enviar usa `onPressIn` (no `onPress`): con el teclado
 * abierto, tocar un botón vecino al campo enfocado a veces hace que
 * Android empiece a cerrar el teclado a mitad del toque, corriendo el
 * botón de lugar y perdiendo el "soltar" — con `onPressIn` el envío ya
 * disparó en el "tocar", antes de que eso pueda pasar. Como respaldo (por
 * si igual se pierde el foco), después de mandar se vuelve a pedir el
 * foco a mano (`inputRef.current.focus()`) — así el teclado queda
 * abierto siempre, como en WhatsApp. El `Enter` del teclado, a propósito,
 * **no** manda — solo agrega un salto de línea, como cualquier campo
 * `multiline` común; mandar es solo cosa del botón.
 */
export const NoteComposer = forwardRef<ComponentRef<typeof TextInput>, Props>(function NoteComposer(
  {
    value,
    onChangeText,
    onSend,
    replyTarget,
    onCancelReply,
    editing = false,
    onCancelEditing,
    onAttach,
    onSendAudio,
  },
  forwardedRef,
) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as ComponentRef<typeof TextInput>);
  const [isRecording, setIsRecording] = useState(false);

  const canSend = value.trim().length > 0;

  function handleSend() {
    onSend();
    inputRef.current?.focus();
  }

  return (
    <View style={styles.wrap}>
      {replyTarget ? (
        <View style={styles.chip}>
          <View style={styles.chipTexts}>
            <Text style={styles.chipTitle}>Respondiendo a</Text>
            <Text style={styles.chipText} numberOfLines={1}>
              {noteMessagePreviewText(replyTarget)}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={8}>
            <X size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : editing ? (
        <View style={styles.chip}>
          <Text style={styles.chipTitle}>Editando mensaje</Text>
          <TouchableOpacity onPress={onCancelEditing} hitSlop={8}>
            <X size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.row}>
        {!isRecording ? (
          <>
            {onAttach && !editing ? (
              <TouchableOpacity style={styles.attachButton} onPress={onAttach} hitSlop={8}>
                <Paperclip size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Escribí un mensaje"
              placeholderTextColor={theme.colors.textMuted}
              value={value}
              onChangeText={onChangeText}
              maxLength={MAX_NOTE_MESSAGE_LENGTH}
              multiline
            />
          </>
        ) : null}
        {canSend ? (
          <TouchableOpacity style={styles.sendButton} onPressIn={handleSend}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        ) : onSendAudio ? (
          <AudioRecordButton onRecordingChange={setIsRecording} onSendAudio={onSendAudio} />
        ) : (
          <View style={[styles.sendButton, styles.sendButtonDisabled]}>
            <Send size={18} color="#fff" />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipTexts: {
    flex: 1,
    gap: 1,
  },
  chipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxHeight: 100,
    fontSize: 14,
    color: theme.colors.text,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
