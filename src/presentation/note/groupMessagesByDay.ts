import { toIsoDate } from '../../core/utils/date';
import { NoteMessage } from '../../domain/note/entities/NoteMessage';

export type NoteTimelineEntry =
  | { kind: 'separator'; key: string; date: Date }
  | { kind: 'message'; key: string; message: NoteMessage };

/**
 * Intercala separadores de día entre los mensajes (ya ordenados por
 * `sentAt` ascendente) — uno antes del primer mensaje de cada día nuevo,
 * igual que un chat de WhatsApp. Lo usan tanto el chat completo como la
 * vista recortada de la card.
 */
export function buildNoteTimeline(messages: readonly NoteMessage[]): NoteTimelineEntry[] {
  const out: NoteTimelineEntry[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const sentDate = new Date(message.sentAt);
    const dayKey = toIsoDate(sentDate);
    if (dayKey !== lastDay) {
      out.push({ kind: 'separator', key: `day-${dayKey}`, date: sentDate });
      lastDay = dayKey;
    }
    out.push({ kind: 'message', key: message.id, message });
  }
  return out;
}
