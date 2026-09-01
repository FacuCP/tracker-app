/**
 * Generador de ids simple para entidades locales (trackers, opciones). No
 * necesitamos UUIDs criptográficos: alcanza con que no colisione en un mismo
 * dispositivo.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
