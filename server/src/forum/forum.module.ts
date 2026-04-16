import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { CloudinaryService } from '../common/infrastructure/media/cloudinary.service';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumCommentEntity } from './infrastructure/persistence/relational/entities/forum-comment.entity';
import { ForumCommentVoteEntity } from './infrastructure/persistence/relational/entities/forum-comment-vote.entity';
import { ForumPostEntity } from './infrastructure/persistence/relational/entities/forum-post.entity';
import { ForumPostVoteEntity } from './infrastructure/persistence/relational/entities/forum-post-vote.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumPostEntity,
      ForumCommentEntity,
      ForumPostVoteEntity,
      ForumCommentVoteEntity,
      UserEntity,
    ]),
  ],
  controllers: [ForumController],
  providers: [ForumService, CloudinaryService],
  exports: [ForumService],
})
export class ForumModule {}
