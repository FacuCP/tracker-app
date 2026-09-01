import { UserProfile } from '../entities/UserProfile';

/**
 * Puerto para el perfil del usuario. `getProfile` devuelve null si todavía no
 * se eligió un nombre (primer arranque de la app).
 */
export interface UserRepository {
  getProfile(): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;
}
