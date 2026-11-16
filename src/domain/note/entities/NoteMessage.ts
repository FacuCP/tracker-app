/**
 * Un mensaje dentro de una anotación: texto, cuándo se mandó, y opcionalmente
 * a qué otro mensaje responde. `sentAt` es una fecha y hora completa (ISO),
 * no solo el día — hace falta la hora para mostrarla en el chat.
 */
export interface NoteMessage {
  readonly id: string;
  readonly noteId: string;
  readonly text: string;
  readonly sentAt: string;
  /**
   * Id del mensaje al que responde, si corresponde (deslizar para
   * responder). No se valida que ese id exista: si el mensaje citado se
   * borró, el que usa esto simplemente no muestra la cita.
   */
  readonly replyToId?: string;
  /** Cuándo se editó por última vez, si se editó. `sentAt` nunca cambia. */
  readonly editedAt?: string;
}

export const MAX_NOTE_MESSAGE_LENGTH = 2000;

export function createNoteMessage(params: {
  id: string;
  noteId: string;
  text: string;
  sentAt: string;
  replyToId?: string;
  editedAt?: string;
}): NoteMessage {
  const text = params.text.trim();
  if (text.length === 0) {
    throw new Error('El mensaje no puede estar vacío');
  }
  if (text.length > MAX_NOTE_MESSAGE_LENGTH) {
    throw new Error(`El mensaje no puede superar los ${MAX_NOTE_MESSAGE_LENGTH} caracteres`);
  }
  if (!params.sentAt) {
    throw new Error('Falta la fecha de envío');
  }
  return {
    id: params.id,
    noteId: params.noteId,
    text,
    sentAt: params.sentAt,
    replyToId: params.replyToId,
    editedAt: params.editedAt,
  };
}
