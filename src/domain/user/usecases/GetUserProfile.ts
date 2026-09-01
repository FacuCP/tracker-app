import { UserProfile } from '../entities/UserProfile';
import { UserRepository } from '../repositories/UserRepository';

/** Devuelve el perfil del usuario, o null si todavía no eligió un nombre. */
export class GetUserProfile {
  constructor(private readonly repository: UserRepository) {}

  execute(): Promise<UserProfile | null> {
    return this.repository.getProfile();
  }
}
