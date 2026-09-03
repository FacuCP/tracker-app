import { FinanceCategory, createFinanceCategory } from '../../../domain/finance/entities/FinanceCategory';

export interface FinanceCategoryDto {
  id: string;
  name: string;
  color: string;
}

export function financeCategoryToDto(category: FinanceCategory): FinanceCategoryDto {
  return { id: category.id, name: category.name, color: category.color };
}

export function financeCategoryFromDto(dto: FinanceCategoryDto): FinanceCategory {
  return createFinanceCategory({ id: dto.id, name: dto.name, color: dto.color });
}
