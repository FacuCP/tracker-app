import { UserRepository } from '../repositories/UserRepository';

/**
 * Arma el saludo del home a partir del nombre del usuario. Si todavía no hay
 * nombre (no debería pasar después del onboarding) devuelve un saludo genérico.
 */
export class GetWelcomeMessage {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<string> {
    const profile = await this.userRepository.getProfile();
    return profile ? `Bienvenido ${profile.name}` : 'Bienvenido';
  }
}
