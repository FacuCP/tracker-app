import { FinanceCategory, createFinanceCategory } from '../entities/FinanceCategory';
import { FinanceCategoryRepository } from '../repositories/FinanceCategoryRepository';

export interface SaveFinanceCategoryInput {
  /** Si viene, se edita esa categoría; si no, se crea una nueva. */
  id?: string;
  name: string;
  color: string;
}

/** Crea o actualiza una categoría de finanzas. */
export class SaveFinanceCategory {
  constructor(
    private readonly repository: FinanceCategoryRepository,
    private readonly generateId: () => string,
  ) {}

  async execute(input: SaveFinanceCategoryInput): Promise<FinanceCategory> {
    const category = createFinanceCategory({
      id: input.id ?? this.generateId(),
      name: input.name,
      color: input.color,
    });
    await this.repository.save(category);
    return category;
  }
}
