import { UserProfile, createUserProfile, isHubTab } from '../../../domain/user/entities/UserProfile';

export interface UserProfileDto {
  name: string;
  defaultTab?: string;
}

export function userProfileToDto(profile: UserProfile): UserProfileDto {
  return { name: profile.name, defaultTab: profile.defaultTab };
}

export function userProfileFromDto(dto: UserProfileDto): UserProfile {
  return createUserProfile({
    name: dto.name,
    defaultTab: isHubTab(dto.defaultTab) ? dto.defaultTab : undefined,
  });
}
