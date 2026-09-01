import { UserRepository } from '../repositories/UserRepository';

/**
 * Caso de uso: contiene una regla de negocio pura (armar el saludo).
 * Depende de la abstracción UserRepository, no de una implementación.
 */
export class GetWelcomeMessage {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<string> {
    const user = await this.userRepository.getCurrentUser();
    return `Bienvenido ${user.name}`;
  }
}
