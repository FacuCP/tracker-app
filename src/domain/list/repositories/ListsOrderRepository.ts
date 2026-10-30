/** Puerto para el orden manual de la pantalla Listas (array de ids de lista). */
export interface ListsOrderRepository {
  get(): Promise<string[]>;
  save(order: string[]): Promise<void>;
}
