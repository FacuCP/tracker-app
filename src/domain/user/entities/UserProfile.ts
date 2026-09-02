/**
 * Perfil del usuario: el nombre que se elige la primera vez que se abre la app
 * y si el mood tracker está marcado como favorito (arranca en true). Se editan
 * en Ajustes y con la estrella de la card del mood tracker.
 */
export interface UserProfile {
  readonly name: string;
  readonly moodFavorite: boolean;
}

export const MAX_USER_NAME = 30;

export function createUserProfile(params: { name: string; moodFavorite?: boolean }): UserProfile {
  const name = params.name.trim();
  if (name.length === 0) {
    throw new Error('Poné un nombre');
  }
  if (name.length > MAX_USER_NAME) {
    throw new Error(`El nombre no puede superar los ${MAX_USER_NAME} caracteres`);
  }
  return { name, moodFavorite: params.moodFavorite ?? true };
}
