/** Puerto para el orden manual de la pantalla Trackers (array de ids de tracker). */
export interface TrackersOrderRepository {
  get(): Promise<string[]>;
  save(order: string[]): Promise<void>;
}
