import { UserProfile, createUserProfile } from '../entities/UserProfile';
import { UserRepository } from '../repositories/UserRepository';

/** Guarda (o cambia) el nombre del usuario, validándolo. */
export class SaveUserName {
  constructor(private readonly repository: UserRepository) {}

  async execute(name: string): Promise<UserProfile> {
    const profile = createUserProfile({ name });
    await this.repository.saveProfile(profile);
    return profile;
  }
}
