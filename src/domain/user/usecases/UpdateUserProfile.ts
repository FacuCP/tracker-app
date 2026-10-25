import { HomeTab, UserProfile, createUserProfile } from '../entities/UserProfile';
import { UserRepository } from '../repositories/UserRepository';

export interface UserProfilePatch {
  name?: string;
  moodFavorite?: boolean;
  financeFavorite?: boolean;
  gymFavorite?: boolean;
  fontScale?: number;
  notifyTrackers?: boolean;
  notifyDueTasks?: boolean;
  homeTab?: HomeTab;
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
      gymFavorite: patch.gymFavorite ?? current?.gymFavorite,
      fontScale: patch.fontScale ?? current?.fontScale,
      notifyTrackers: patch.notifyTrackers ?? current?.notifyTrackers,
      notifyDueTasks: patch.notifyDueTasks ?? current?.notifyDueTasks,
      homeTab: patch.homeTab ?? current?.homeTab,
    });
    await this.repository.saveProfile(profile);
    return profile;
  }
}
