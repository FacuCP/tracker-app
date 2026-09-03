import { UserProfile, createUserProfile } from '../entities/UserProfile';
import { UserRepository } from '../repositories/UserRepository';

export interface UserProfilePatch {
  name?: string;
  moodFavorite?: boolean;
  financeFavorite?: boolean;
  fontScale?: number;
}

/**
 * Crea o actualiza el perfil. Hace merge con lo que ya había guardado, así se
 * puede cambiar un solo campo.
 */
export class UpdateUserProfile {
  constructor(private readonly repository: UserRepository) {}

  async execute(patch: UserProfilePatch): Promise<UserProfile> {
    const current = await this.repository.getProfile();
    const profile = createUserProfile({
      name: patch.name ?? current?.name ?? '',
      moodFavorite: patch.moodFavorite ?? current?.moodFavorite,
      financeFavorite: patch.financeFavorite ?? current?.financeFavorite,
      fontScale: patch.fontScale ?? current?.fontScale,
    });
    await this.repository.saveProfile(profile);
    return profile;
  }
}
