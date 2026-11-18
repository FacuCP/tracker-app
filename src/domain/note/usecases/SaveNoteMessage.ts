import { NoteMessage, NoteMessageKind, NoteMessageMedia, createNoteMessage } from '../entities/NoteMessage';
import { NoteMessageRepository } from '../repositories/NoteMessageRepository';
import { NoteRepository } from '../repositories/NoteRepository';

export interface SaveNoteMessageInput {
  /** Si viene, se edita ese mensaje; si no, se crea uno nuevo. */
  id?: string;
  /**
   * Al crear: la anotación desde la que se manda (`[esaId]`). Al editar
   * texto: las mismas de antes, sin tocar — cambiar a qué anotaciones
   * pertenece un mensaje es cosa de `SetNoteMessageNotes`, no de acá.
   */
  noteIds: string[];
  /** `'text'` por default. Un mensaje de medios no se edita con esto (ver `kind`/`media`/`mediaItems`). */
  kind?: NoteMessageKind;
  text?: string;
  media?: NoteMessageMedia;
  /** Varias fotos mandadas como un solo mensaje — solo con `kind: 'image'`, ver `NoteMessage.mediaItems`. */
  mediaItems?: NoteMessageMedia[];
  /**
   * Quien llama ya tiene el dato: al crear, la fecha/hora de ahora; al
   * editar, la `sentAt` original sin tocar (no se vuelve a "enviar").
   */
  sentAt: string;
  /** Al crear, el mensaje al que responde (si se deslizó uno); al editar, el original sin tocar. */
  replyToId?: string;
  /** Solo al editar: la fecha/hora de la edición. */
  editedAt?: string;
  /** Al editar texto: el valor de antes, sin tocar (cambiarlo es cosa de SetNoteMessageFavorite). */
  favorite?: boolean;
}

/** Crea o actualiza un mensaje. No cambia a qué anotaciones pertenece un mensaje existente — ver `SetNoteMessageNotes`. */
export class SaveNoteMessage {
  constructor(
    private readonly notes: NoteRepository,
    private readonly messages: NoteMessageRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveNoteMessageInput): Promise<NoteMessage> {
    for (const noteId of input.noteIds) {
      const note = await this.notes.getById(noteId);
      if (!note) {
        throw new Error('La anotación no existe');
      }
    }

    const message = createNoteMessage({
      id: input.id ?? this.generateId(),
      noteIds: input.noteIds,
      kind: input.kind,
      text: input.text,
      media: input.media,
      mediaItems: input.mediaItems,
      sentAt: input.sentAt,
      replyToId: input.replyToId,
      editedAt: input.editedAt,
      favorite: input.favorite,
    });
    await this.messages.saveMessage(message);
    return message;
  }
}
