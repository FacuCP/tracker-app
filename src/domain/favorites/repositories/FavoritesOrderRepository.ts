/** Puerto para el orden manual de la pantalla Favoritos (lista de claves). */
export interface FavoritesOrderRepository {
  get(): Promise<string[]>;
  save(order: string[]): Promise<void>;
}
