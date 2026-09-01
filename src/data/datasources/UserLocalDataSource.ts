import { User, createUser } from '../../domain/entities/User';

/**
 * Fuente de datos local. Hoy devuelve un usuario fijo; mañana podría leer
 * de AsyncStorage, SQLite, un archivo, etc. La capa superior no se entera.
 */
export interface UserLocalDataSource {
  getUser(): Promise<User>;
}

export class InMemoryUserLocalDataSource implements UserLocalDataSource {
  async getUser(): Promise<User> {
    return createUser({ id: '1', name: 'Facu' });
  }
}
