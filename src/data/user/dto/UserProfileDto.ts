import { UserProfile, createUserProfile } from '../../../domain/user/entities/UserProfile';

export interface UserProfileDto {
  name: string;
  moodFavorite?: boolean;
  financeFavorite?: boolean;
  fontScale?: number;
}

export function userProfileToDto(profile: UserProfile): UserProfileDto {
  return {
    name: profile.name,
    moodFavorite: profile.moodFavorite,
    financeFavorite: profile.financeFavorite,
    fontScale: profile.fontScale,
  };
}

export function userProfileFromDto(dto: UserProfileDto): UserProfile {
  return createUserProfile({
    name: dto.name,
    moodFavorite: dto.moodFavorite ?? true,
    financeFavorite: dto.financeFavorite ?? true,
    fontScale: dto.fontScale ?? 1,
  });
}
