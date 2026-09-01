/**
 * Entidad de dominio. No depende de frameworks ni de librerías externas:
 * es solo un objeto de negocio con sus reglas.
 */
export interface User {
  readonly id: string;
  readonly name: string;
}

export function createUser(params: User): User {
  if (params.name.trim().length === 0) {
    throw new Error('El nombre del usuario no puede estar vacío');
  }
  return { id: params.id, name: params.name.trim() };
}
