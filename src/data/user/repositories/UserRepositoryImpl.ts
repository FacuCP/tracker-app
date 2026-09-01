import { UserProfile } from '../../../domain/user/entities/UserProfile';
import { UserRepository } from '../../../domain/user/repositories/UserRepository';
import { UserLocalDataSource } from '../datasources/UserLocalDataSource';
import { userProfileFromDto, userProfileToDto } from '../dto/UserProfileDto';

export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly local: UserLocalDataSource) {}

  async getProfile(): Promise<UserProfile | null> {
    const dto = await this.local.read();
    if (!dto) return null;
    try {
      return userProfileFromDto(dto);
    } catch {
      return null;
    }
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await this.local.write(userProfileToDto(profile));
  }
}
