import { DailyTaskProgress } from '../../../domain/dailyRoutine/entities/DailyTaskProgress';
import { DailyTaskProgressRepository } from '../../../domain/dailyRoutine/repositories/DailyTaskProgressRepository';
import { DailyTaskProgressLocalDataSource } from '../datasources/DailyTaskProgressLocalDataSource';
import { dailyTaskProgressFromDto, dailyTaskProgressToDto } from '../dto/DailyTaskProgressDto';

export class DailyTaskProgressRepositoryImpl implements DailyTaskProgressRepository {
  constructor(private readonly local: DailyTaskProgressLocalDataSource) {}

  async getAll(): Promise<Record<string, DailyTaskProgress>> {
    const all = await this.local.readAll();
    const result: Record<string, DailyTaskProgress> = {};
    for (const [taskId, dto] of Object.entries(all)) {
      result[taskId] = dailyTaskProgressFromDto(dto);
    }
    return result;
  }

  async save(progress: DailyTaskProgress): Promise<void> {
    await this.local.write(dailyTaskProgressToDto(progress));
  }

  async deleteForTask(taskId: string): Promise<void> {
    await this.local.remove(taskId);
  }
}
