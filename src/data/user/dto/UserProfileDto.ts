import { UserProfile, createUserProfile } from '../../../domain/user/entities/UserProfile';

export interface UserProfileDto {
  name: string;
  moodFavorite?: boolean;
  financeFavorite?: boolean;
  gymFavorite?: boolean;
  fontScale?: number;
  notifyTrackers?: boolean;
  notifyDueTasks?: boolean;
}

export function userProfileToDto(profile: UserProfile): UserProfileDto {
  return {
    name: profile.name,
    moodFavorite: profile.moodFavorite,
    financeFavorite: profile.financeFavorite,
    gymFavorite: profile.gymFavorite,
    fontScale: profile.fontScale,
    notifyTrackers: profile.notifyTrackers,
    notifyDueTasks: profile.notifyDueTasks,
  };
}

export function userProfileFromDto(dto: UserProfileDto): UserProfile {
  return createUserProfile({
    name: dto.name,
    moodFavorite: dto.moodFavorite ?? true,
    financeFavorite: dto.financeFavorite ?? true,
    gymFavorite: dto.gymFavorite ?? true,
    fontScale: dto.fontScale ?? 1,
    notifyTrackers: dto.notifyTrackers ?? false,
    notifyDueTasks: dto.notifyDueTasks ?? false,
  });
}
