import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class EnsureLedgerUserInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (user?.userId && user.email) {
      const name =
        user.name?.trim() ||
        user.email.split('@')[0] ||
        'User';
      await this.prisma.user.upsert({
        where: { id: user.userId },
        create: {
          id: user.userId,
          email: user.email,
          name,
          passwordHash: '',
        },
        update: {
          email: user.email,
          name,
        },
      });
    }
    return next.handle();
  }
}
