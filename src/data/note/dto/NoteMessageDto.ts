import { NoteMessage, NoteMessageKind, NoteMessageMedia, createNoteMessage } from '../../../domain/note/entities/NoteMessage';

export interface NoteMessageDto {
  id: string;
  noteIds: string[];
  kind: NoteMessageKind;
  text: string;
  media?: NoteMessageMedia;
  mediaItems?: NoteMessageMedia[];
  sentAt: string;
  replyToId?: string;
  editedAt?: string;
  favorite?: boolean;
}

export function noteMessageToDto(message: NoteMessage): NoteMessageDto {
  return {
    id: message.id,
    noteIds: [...message.noteIds],
    kind: message.kind,
    text: message.text,
    media: message.media,
    mediaItems: message.mediaItems ? [...message.mediaItems] : undefined,
    sentAt: message.sentAt,
    replyToId: message.replyToId,
    editedAt: message.editedAt,
    favorite: message.favorite,
  };
}

export function noteMessageFromDto(dto: NoteMessageDto): NoteMessage {
  return createNoteMessage({
    id: dto.id,
    noteIds: dto.noteIds,
    kind: dto.kind,
    text: dto.text,
    media: dto.media,
    mediaItems: dto.mediaItems,
    sentAt: dto.sentAt,
    replyToId: dto.replyToId,
    editedAt: dto.editedAt,
    favorite: dto.favorite,
  });
}
