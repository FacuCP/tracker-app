/**
 * Perfil del usuario. Por ahora es solo el nombre que se elige la primera vez
 * que se abre la app y se puede cambiar en Ajustes.
 */
export interface UserProfile {
  readonly name: string;
}

export const MAX_USER_NAME = 30;

export function createUserProfile(params: { name: string }): UserProfile {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('Poné un nombre');
  }
  if (name.length > MAX_USER_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_USER_NAME} caracteres`);
  }
  return { name };
}
