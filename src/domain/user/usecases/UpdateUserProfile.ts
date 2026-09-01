import { HubTab, UserProfile, createUserProfile } from '../entities/UserProfile';
import { UserRepository } from '../repositories/UserRepository';

export interface UserProfilePatch {
  name?: string;
  defaultTab?: HubTab;
}

/**
 * Crea o actualiza el perfil. Hace merge con lo que ya había guardado, así se
 * puede cambiar solo el nombre o solo la pestaña por defecto.
 */
export class UpdateUserProfile {
  constructor(private readonly repository: UserRepository) {}

  async execute(patch: UserProfilePatch): Promise<UserProfile> {
    const current = await this.repository.getProfile();
    const profile = createUserProfile({
      name: patch.name ?? current?.name ?? '',
      defaultTab: patch.defaultTab ?? current?.defaultTab,
    });
    await this.repository.saveProfile(profile);
    return profile;
  }
}
