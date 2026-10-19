import { DailyRoutineTask } from '../../../domain/dailyRoutine/entities/DailyRoutineTask';
import { DailyRoutineTaskRepository } from '../../../domain/dailyRoutine/repositories/DailyRoutineTaskRepository';
import { DailyRoutineTaskLocalDataSource } from '../datasources/DailyRoutineTaskLocalDataSource';
import { dailyRoutineTaskFromDto, dailyRoutineTaskToDto } from '../dto/DailyRoutineTaskDto';

export class DailyRoutineTaskRepositoryImpl implements DailyRoutineTaskRepository {
  constructor(private readonly local: DailyRoutineTaskLocalDataSource) {}

  async getAll(): Promise<DailyRoutineTask[]> {
    const all = await this.local.readAll();
    return Object.values(all).map(dailyRoutineTaskFromDto);
  }

  async save(task: DailyRoutineTask): Promise<void> {
    await this.local.write(dailyRoutineTaskToDto(task));
  }

  async saveMany(tasks: DailyRoutineTask[]): Promise<void> {
    await this.local.writeMany(tasks.map(dailyRoutineTaskToDto));
  }

  async delete(id: string): Promise<void> {
    await this.local.remove(id);
  }
}
