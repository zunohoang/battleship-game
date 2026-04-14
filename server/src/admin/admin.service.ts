import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/domain/entities/user';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { BanUserDto } from './dto/ban-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async banUser(actor: User, userId: string, dto: BanUserDto): Promise<void> {
    if (actor.role?.toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException({
        error: 'ADMIN_FORBIDDEN',
        message: 'Only admins can perform this action',
      });
    }

    const target = await this.userRepo.findOne({ where: { id: userId } });
    if (!target) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (target.id === actor.id) {
      throw new BadRequestException({
        error: 'ADMIN_CANNOT_BAN_SELF',
        message: 'Admin cannot ban themselves',
      });
    }

    const reason = dto.reason?.trim() || null;
    target.banReason = reason;
    target.bannedAt = new Date();

    if (dto.type === 'temporary') {
      if (!dto.days) {
        throw new BadRequestException({
          error: 'BAN_DAYS_REQUIRED',
          message: 'days is required for temporary ban',
        });
      }
      const until = new Date();
      until.setDate(until.getDate() + dto.days);
      target.bannedPermanent = false;
      target.bannedUntil = until;
    } else {
      target.bannedPermanent = true;
      target.bannedUntil = null;
    }

    // Revoke refresh session to force re-authentication.
    target.refreshTokenHash = null;
    target.refreshTokenAbsoluteExpiry = null;

    await this.userRepo.save(target);
  }
}
