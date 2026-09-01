import { UserProfile, createUserProfile } from '../../../domain/user/entities/UserProfile';

export interface UserProfileDto {
  name: string;
}

export function userProfileToDto(profile: UserProfile): UserProfileDto {
  return { name: profile.name };
}

export function userProfileFromDto(dto: UserProfileDto): UserProfile {
  return createUserProfile({ name: dto.name });
}
