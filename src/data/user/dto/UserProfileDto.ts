import { UserProfile, createUserProfile } from '../../../domain/user/entities/UserProfile';

export interface UserProfileDto {
  name: string;
  moodFavorite?: boolean;
}

export function userProfileToDto(profile: UserProfile): UserProfileDto {
  return { name: profile.name, moodFavorite: profile.moodFavorite };
}

export function userProfileFromDto(dto: UserProfileDto): UserProfile {
  return createUserProfile({ name: dto.name, moodFavorite: dto.moodFavorite ?? true });
}
