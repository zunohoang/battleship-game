import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { RoomEntity } from '../game/infrastructure/persistence/relational/entities/room.entity';
import { MatchEntity } from '../game/infrastructure/persistence/relational/entities/match.entity';
import { ForumPostEntity } from '../forum/infrastructure/persistence/relational/entities/forum-post.entity';
import { ForumCommentEntity } from '../forum/infrastructure/persistence/relational/entities/forum-comment.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoomEntity,
      MatchEntity,
      ForumPostEntity,
      ForumCommentEntity,
    ]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
