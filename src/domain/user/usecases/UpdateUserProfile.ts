import { UserProfile, createUserProfile } from '../entities/UserProfile';
import { UserRepository } from '../repositories/UserRepository';

export interface UserProfilePatch {
  name?: string;
  moodFavorite?: boolean;
}

/**
 * Crea o actualiza el perfil. Hace merge con lo que ya había guardado, así se
 * puede cambiar solo el nombre o solo el favorito del mood tracker.
 */
export class UpdateUserProfile {
  constructor(private readonly repository: UserRepository) {}

  async execute(patch: UserProfilePatch): Promise<UserProfile> {
    const current = await this.repository.getProfile();
    const profile = createUserProfile({
      name: patch.name ?? current?.name ?? '',
      moodFavorite: patch.moodFavorite ?? current?.moodFavorite,
    });
    await this.repository.saveProfile(profile);
    return profile;
  }
}
