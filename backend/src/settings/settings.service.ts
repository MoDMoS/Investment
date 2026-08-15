import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { repatriationGoalThb: true },
    });
    return {
      repatriationGoalThb: user.repatriationGoalThb,
    };
  }

  async update(
    userId: string,
    dto: { repatriationGoalThb?: number | null },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        repatriationGoalThb:
          dto.repatriationGoalThb === undefined
            ? undefined
            : dto.repatriationGoalThb,
      },
      select: { repatriationGoalThb: true },
    });
    return {
      repatriationGoalThb: user.repatriationGoalThb,
    };
  }
}
