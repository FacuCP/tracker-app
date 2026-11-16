import { NoteMessage, createNoteMessage } from '../entities/NoteMessage';
import { NoteMessageRepository } from '../repositories/NoteMessageRepository';
import { NoteRepository } from '../repositories/NoteRepository';

export interface SaveNoteMessageInput {
  /** Si viene, se edita ese mensaje; si no, se crea uno nuevo. */
  id?: string;
  noteId: string;
  text: string;
  /**
   * Quien llama ya tiene el dato: al crear, la fecha/hora de ahora; al
   * editar, la `sentAt` original sin tocar (no se vuelve a "enviar").
   */
  sentAt: string;
  /** Al crear, el mensaje al que responde (si se deslizó uno); al editar, el original sin tocar. */
  replyToId?: string;
  /** Solo al editar: la fecha/hora de la edición. */
  editedAt?: string;
}

/** Crea o actualiza un mensaje de una anotación. */
export class SaveNoteMessage {
  constructor(
    private readonly notes: NoteRepository,
    private readonly messages: NoteMessageRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveNoteMessageInput): Promise<NoteMessage> {
    const note = await this.notes.getById(input.noteId);
    if (!note) {
      throw new Error('La anotación no existe');
    }

    const message = createNoteMessage({
      id: input.id ?? this.generateId(),
      noteId: input.noteId,
      text: input.text,
      sentAt: input.sentAt,
      replyToId: input.replyToId,
      editedAt: input.editedAt,
    });
    await this.messages.saveMessage(message);
    return message;
  }
}
