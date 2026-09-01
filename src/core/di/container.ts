import { InMemoryUserLocalDataSource } from '../../data/datasources/UserLocalDataSource';
import { UserRepositoryImpl } from '../../data/repositories/UserRepositoryImpl';
import { GetWelcomeMessage } from '../../domain/usecases/GetWelcomeMessage';

/**
 * Composición de dependencias (Composition Root). Es el único lugar donde
 * se "arman" las implementaciones concretas. La UI pide casos de uso a este
 * contenedor y no sabe nada de datasources ni repositorios.
 */
const userLocalDataSource = new InMemoryUserLocalDataSource();
const userRepository = new UserRepositoryImpl(userLocalDataSource);

export const container = {
  getWelcomeMessage: new GetWelcomeMessage(userRepository),
};

export type Container = typeof container;
