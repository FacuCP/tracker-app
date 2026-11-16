import { NoteMessage, createNoteMessage } from '../../../domain/note/entities/NoteMessage';

export interface NoteMessageDto {
  id: string;
  noteId: string;
  text: string;
  sentAt: string;
  replyToId?: string;
  editedAt?: string;
}

export function noteMessageToDto(message: NoteMessage): NoteMessageDto {
  return {
    id: message.id,
    noteId: message.noteId,
    text: message.text,
    sentAt: message.sentAt,
    replyToId: message.replyToId,
    editedAt: message.editedAt,
  };
}

export function noteMessageFromDto(dto: NoteMessageDto): NoteMessage {
  return createNoteMessage({
    id: dto.id,
    noteId: dto.noteId,
    text: dto.text,
    sentAt: dto.sentAt,
    replyToId: dto.replyToId,
    editedAt: dto.editedAt,
  });
}
