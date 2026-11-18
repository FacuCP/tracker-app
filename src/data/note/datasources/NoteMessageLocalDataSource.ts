import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { NoteMessageDto } from '../dto/NoteMessageDto';

/**
 * Fuente de datos local de los mensajes. Blob JSON plano:
 * { [messageId]: NoteMessageDto }. Un mensaje puede pertenecer a varias
 * anotaciones (`dto.noteIds`), así que ya no tiene sentido anidarlo bajo
 * una sola — antes de #135 era { [noteId]: { [messageId]: dto } }, ver
 * `normalizeShape` para la migración desde ese formato viejo.
 */
export interface NoteMessageLocalDataSource {
  readAll(): Promise<Record<string, NoteMessageDto>>;
  write(message: NoteMessageDto): Promise<void>;
  /** Devuelve el dto borrado (o `null` si no existía), para que el repositorio limpie su archivo si tenía. */
  remove(messageId: string): Promise<NoteMessageDto | null>;
  /** Devuelve los dtos que se borraron del todo (no solo desvinculados), para que el repositorio limpie sus archivos. */
  detachFromNote(noteId: string): Promise<NoteMessageDto[]>;
}

const STORAGE_KEY = STORAGE_KEYS.noteMessages;

/**
 * Formato viejo (antes de que un mensaje pudiera pertenecer a varias
 * anotaciones, ver #135): blob anidado `{ [noteId]: { [messageId]: dto } }`,
 * con cada mensaje apuntando a una sola anotación. Esta función lo detecta
 * y lo aplana **en memoria**, sin volver a escribirlo — el próximo guardado
 * real (mandar un mensaje, editarlo, cambiar a qué anotación pertenece
 * cualquier mensaje) ya persiste el formato nuevo solo, como efecto normal
 * de guardar. Mismo criterio que ya usa este proyecto para otras
 * migraciones de forma (p. ej. el `time`→`timeFrom` de `EventDto`): migrar
 * al leer, nunca como efecto secundario de una lectura.
 *
 * Detección: si ALGÚN valor de primer nivel tiene `.text` directo (un
 * string), el blob ya está en el formato nuevo (plano) — se usa tal cual.
 * Si no, cada valor de primer nivel cuyos propios valores tengan `.text` es
 * un "balde" viejo de una anotación — se aplana, y cada mensaje recibe
 * `noteIds: [esa anotación]`. Un blob de baldes vacíos (`remove` viejo
 * nunca borraba el balde cuando quedaba sin mensajes) no tiene nada para
 * aplanar en ningún caso — da lo mismo tratarlo como viejo o nuevo.
 */
function normalizeShape(raw: Record<string, unknown>): Record<string, NoteMessageDto> {
  const topLevelValues = Object.values(raw);
  const alreadyFlat = topLevelValues.some(
    (value) => value != null && typeof value === 'object' && typeof (value as { text?: unknown }).text === 'string',
  );
  if (alreadyFlat) {
    return raw as Record<string, NoteMessageDto>;
  }

  const flattened: Record<string, NoteMessageDto> = {};
  for (const [noteId, bucket] of Object.entries(raw)) {
    if (bucket == null || typeof bucket !== 'object') continue;
    for (const [messageId, oldDto] of Object.entries(bucket as Record<string, Record<string, unknown>>)) {
      if (oldDto == null || typeof oldDto.text !== 'string') continue;
      flattened[messageId] = {
        id: typeof oldDto.id === 'string' ? oldDto.id : messageId,
        noteIds: [noteId],
        kind: 'text',
        text: oldDto.text,
        sentAt: typeof oldDto.sentAt === 'string' ? oldDto.sentAt : '',
        replyToId: typeof oldDto.replyToId === 'string' ? oldDto.replyToId : undefined,
        editedAt: typeof oldDto.editedAt === 'string' ? oldDto.editedAt : undefined,
      };
    }
  }
  return flattened;
}

export class AsyncStorageNoteMessageLocalDataSource implements NoteMessageLocalDataSource {
  async readAll(): Promise<Record<string, NoteMessageDto>> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = (JSON.parse(raw) as Record<string, unknown>) ?? {};
      return normalizeShape(parsed);
    } catch {
      return {};
    }
  }

  private async persist(all: Record<string, NoteMessageDto>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async write(message: NoteMessageDto): Promise<void> {
    const all = await this.readAll();
    all[message.id] = message;
    await this.persist(all);
  }

  async remove(messageId: string): Promise<NoteMessageDto | null> {
    const all = await this.readAll();
    const removed = all[messageId] ?? null;
    if (removed) {
      delete all[messageId];
      await this.persist(all);
    }
    return removed;
  }

  async detachFromNote(noteId: string): Promise<NoteMessageDto[]> {
    const all = await this.readAll();
    const removed: NoteMessageDto[] = [];
    for (const dto of Object.values(all)) {
      if (!dto.noteIds.includes(noteId)) continue;
      if (dto.noteIds.length === 1) {
        delete all[dto.id];
        removed.push(dto);
      } else {
        all[dto.id] = { ...dto, noteIds: dto.noteIds.filter((id) => id !== noteId) };
      }
    }
    await this.persist(all);
    return removed;
  }
}
