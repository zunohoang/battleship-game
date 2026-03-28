import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserEntity } from '../auth/infrastructure/persistence/relational/entities/user.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ForumPostsQueryDto } from './dto/forum-posts-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ForumCommentEntity } from './infrastructure/persistence/relational/entities/forum-comment.entity';
import { ForumCommentVoteEntity } from './infrastructure/persistence/relational/entities/forum-comment-vote.entity';
import { ForumPostEntity } from './infrastructure/persistence/relational/entities/forum-post.entity';
import { ForumPostVoteEntity } from './infrastructure/persistence/relational/entities/forum-post-vote.entity';
import { sanitizeForumText } from './validation/forum-validation';

type VoteValue = -1 | 1;

type AuthorSummary = {
  id: string;
  username: string;
  avatar: string | null;
};

export type ForumPostDto = {
  id: string;
  title: string;
  content: string;
  status: 'published' | 'archived';
  voteScore: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: AuthorSummary;
};

export type ForumCommentDto = {
  id: string;
  postId: string;
  content: string;
  voteScore: number;
  createdAt: string;
  updatedAt: string;
  author: AuthorSummary;
};

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumPostEntity)
    private readonly postRepo: Repository<ForumPostEntity>,
    @InjectRepository(ForumCommentEntity)
    private readonly commentRepo: Repository<ForumCommentEntity>,
    @InjectRepository(ForumPostVoteEntity)
    private readonly postVoteRepo: Repository<ForumPostVoteEntity>,
    @InjectRepository(ForumCommentVoteEntity)
    private readonly commentVoteRepo: Repository<ForumCommentVoteEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async listPosts(query: ForumPostsQueryDto): Promise<{
    page: number;
    limit: number;
    total: number;
    data: ForumPostDto[];
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sort = query.sort ?? 'newest';
    const search = query.q?.trim();
    const skip = (page - 1) * limit;

    const qb = this.postRepo
      .createQueryBuilder('post')
      .where('post.status = :status', { status: 'published' });

    if (search) {
      qb.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (sort === 'top') {
      qb.orderBy('post.voteScore', 'DESC').addOrderBy('post.createdAt', 'DESC');
    } else if (sort === 'comments') {
      qb
        .orderBy('post.commentCount', 'DESC')
        .addOrderBy('post.createdAt', 'DESC');
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    qb.skip(skip).take(limit);

    const [posts, total] = await qb.getManyAndCount();

    return {
      page,
      limit,
      total,
      data: await this.mapPosts(posts),
    };
  }

  async getPostById(postId: string): Promise<ForumPostDto> {
    const post = await this.postRepo.findOne({
      where: {
        id: postId,
        status: 'published',
      },
    });
    if (!post) {
      throw new NotFoundException({
        error: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }

    const mapped = await this.mapPosts([post]);
    return mapped[0];
  }

  async createPost(userId: string, dto: CreatePostDto): Promise<ForumPostDto> {
    const title = sanitizeForumText(dto.title);
    const content = sanitizeForumText(dto.content);
    this.assertContent(title, 'FORUM_POST_TITLE_REQUIRED');
    this.assertContent(content, 'FORUM_POST_CONTENT_REQUIRED');

    const post = this.postRepo.create({
      id: randomUUID(),
      authorId: userId,
      title,
      content,
      voteScore: 0,
      commentCount: 0,
      status: 'published',
    });
    const saved = await this.postRepo.save(post);
    const mapped = await this.mapPosts([saved]);
    return mapped[0];
  }

  async updatePost(
    userId: string,
    postId: string,
    dto: UpdatePostDto,
  ): Promise<ForumPostDto> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({
        error: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
    this.assertAuthor(post.authorId, userId);

    if (typeof dto.title === 'string') {
      const title = sanitizeForumText(dto.title);
      this.assertContent(title, 'FORUM_POST_TITLE_REQUIRED');
      post.title = title;
    }

    if (typeof dto.content === 'string') {
      const content = sanitizeForumText(dto.content);
      this.assertContent(content, 'FORUM_POST_CONTENT_REQUIRED');
      post.content = content;
    }

    const saved = await this.postRepo.save(post);
    const mapped = await this.mapPosts([saved]);
    return mapped[0];
  }

  async archivePost(userId: string, postId: string): Promise<void> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post || post.status !== 'published') {
      throw new NotFoundException({
        error: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }

    this.assertAuthor(post.authorId, userId);
    post.status = 'archived';
    await this.postRepo.save(post);
  }

  async listComments(postId: string): Promise<ForumCommentDto[]> {
    await this.ensurePostPublished(postId);
    const comments = await this.commentRepo.find({
      where: { postId },
      order: { createdAt: 'ASC' },
      take: 300,
    });

    return this.mapComments(comments);
  }

  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<ForumCommentDto> {
    await this.ensurePostPublished(postId);
    const content = sanitizeForumText(dto.content);
    this.assertContent(content, 'FORUM_COMMENT_REQUIRED');

    const comment = this.commentRepo.create({
      id: randomUUID(),
      postId,
      authorId: userId,
      content,
      voteScore: 0,
    });

    const saved = await this.commentRepo.save(comment);
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);

    const mapped = await this.mapComments([saved]);
    return mapped[0];
  }

  async updateComment(
    userId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<ForumCommentDto> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException({
        error: 'FORUM_COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    this.assertAuthor(comment.authorId, userId);

    if (typeof dto.content === 'string') {
      const content = sanitizeForumText(dto.content);
      this.assertContent(content, 'FORUM_COMMENT_REQUIRED');
      comment.content = content;
    }

    const saved = await this.commentRepo.save(comment);
    const mapped = await this.mapComments([saved]);
    return mapped[0];
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException({
        error: 'FORUM_COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    this.assertAuthor(comment.authorId, userId);
    await this.commentRepo.delete({ id: comment.id });
    await this.commentVoteRepo.delete({ commentId: comment.id });
    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);
  }

  async votePost(
    userId: string,
    postId: string,
    voteValue: VoteValue,
  ): Promise<{ voteScore: number; viewerVote: -1 | 0 | 1 }> {
    await this.ensurePostPublished(postId);
    const existing = await this.postVoteRepo.findOne({
      where: { postId, userId },
    });
    const { delta, viewerVote } = this.applyVoteChange(
      existing?.value,
      voteValue,
    );

    if (viewerVote === 0) {
      await this.postVoteRepo.delete({ postId, userId });
    } else if (!existing) {
      await this.postVoteRepo.save(
        this.postVoteRepo.create({
          postId,
          userId,
          value: viewerVote,
        }),
      );
    } else {
      existing.value = viewerVote;
      await this.postVoteRepo.save(existing);
    }

    if (delta !== 0) {
      await this.postRepo.increment({ id: postId }, 'voteScore', delta);
    }
    const post = await this.postRepo.findOne({ where: { id: postId } });

    return {
      voteScore: post?.voteScore ?? 0,
      viewerVote,
    };
  }

  async voteComment(
    userId: string,
    commentId: string,
    voteValue: VoteValue,
  ): Promise<{ voteScore: number; viewerVote: -1 | 0 | 1 }> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException({
        error: 'FORUM_COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    await this.ensurePostPublished(comment.postId);

    const existing = await this.commentVoteRepo.findOne({
      where: { commentId, userId },
    });
    const { delta, viewerVote } = this.applyVoteChange(
      existing?.value,
      voteValue,
    );

    if (viewerVote === 0) {
      await this.commentVoteRepo.delete({ commentId, userId });
    } else if (!existing) {
      await this.commentVoteRepo.save(
        this.commentVoteRepo.create({
          commentId,
          userId,
          value: viewerVote,
        }),
      );
    } else {
      existing.value = viewerVote;
      await this.commentVoteRepo.save(existing);
    }

    if (delta !== 0) {
      await this.commentRepo.increment({ id: commentId }, 'voteScore', delta);
    }

    const updated = await this.commentRepo.findOne({ where: { id: commentId } });
    return {
      voteScore: updated?.voteScore ?? 0,
      viewerVote,
    };
  }

  private async mapPosts(posts: ForumPostEntity[]): Promise<ForumPostDto[]> {
    if (posts.length === 0) {
      return [];
    }

    const userIds = [...new Set(posts.map((post) => post.authorId))];
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    return posts.map((post) => {
      const author = userMap.get(post.authorId);

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        status: post.status,
        voteScore: post.voteScore,
        commentCount: post.commentCount,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        author: {
          id: post.authorId,
          username: author?.username ?? 'unknown',
          avatar: author?.avatar ?? null,
        },
      };
    });
  }

  private async mapComments(
    comments: ForumCommentEntity[],
  ): Promise<ForumCommentDto[]> {
    if (comments.length === 0) {
      return [];
    }

    const userIds = [...new Set(comments.map((comment) => comment.authorId))];
    const users = await this.userRepo.find({
      where: { id: In(userIds) },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    return comments.map((comment) => {
      const author = userMap.get(comment.authorId);

      return {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        voteScore: comment.voteScore,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: {
          id: comment.authorId,
          username: author?.username ?? 'unknown',
          avatar: author?.avatar ?? null,
        },
      };
    });
  }

  private applyVoteChange(
    existingValue: VoteValue | undefined,
    requestedValue: VoteValue,
  ): { delta: number; viewerVote: -1 | 0 | 1 } {
    if (existingValue === requestedValue) {
      return {
        delta: -existingValue,
        viewerVote: 0,
      };
    }

    if (!existingValue) {
      return {
        delta: requestedValue,
        viewerVote: requestedValue,
      };
    }

    return {
      delta: requestedValue - existingValue,
      viewerVote: requestedValue,
    };
  }

  private async ensurePostPublished(postId: string): Promise<void> {
    const post = await this.postRepo.findOne({
      where: { id: postId, status: 'published' },
      select: ['id'],
    });
    if (!post) {
      throw new NotFoundException({
        error: 'FORUM_POST_NOT_FOUND',
        message: 'Post not found',
      });
    }
  }

  private assertAuthor(authorId: string, userId: string): void {
    if (authorId !== userId) {
      throw new BadRequestException({
        error: 'FORUM_FORBIDDEN',
        message: 'Only author can modify this resource',
      });
    }
  }

  private assertContent(value: string, errorCode: string): void {
    if (!value) {
      throw new BadRequestException({
        error: errorCode,
        message: 'Invalid forum content',
      });
    }
  }
}
