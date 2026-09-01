import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../../core/storage/keys';
import { UserProfileDto } from '../dto/UserProfileDto';

/** Fuente de datos local del perfil (AsyncStorage, una sola clave). */
export interface UserLocalDataSource {
  read(): Promise<UserProfileDto | null>;
  write(dto: UserProfileDto): Promise<void>;
}

const STORAGE_KEY = STORAGE_KEYS.userProfile;

export class AsyncStorageUserLocalDataSource implements UserLocalDataSource {
  async read(): Promise<UserProfileDto | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as UserProfileDto;
      return parsed && typeof parsed.name === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  async write(dto: UserProfileDto): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dto));
  }
}
