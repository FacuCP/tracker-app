import { User } from '../entities/User';

/**
 * Puerto (interfaz) que define el dominio. La capa de datos provee la
 * implementación concreta. El dominio nunca conoce de dónde salen los datos.
 */
export interface UserRepository {
  getCurrentUser(): Promise<User>;
}
