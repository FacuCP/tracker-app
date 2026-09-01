import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { UserLocalDataSource } from '../datasources/UserLocalDataSource';

/**
 * Implementación del puerto UserRepository. Orquesta las fuentes de datos
 * y traduce sus resultados a entidades de dominio.
 */
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly localDataSource: UserLocalDataSource) {}

  getCurrentUser(): Promise<User> {
    return this.localDataSource.getUser();
  }
}
