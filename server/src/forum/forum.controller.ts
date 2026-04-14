import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/domain/entities/user';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ForumPostsQueryDto } from './dto/forum-posts-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { VoteDto } from './dto/vote.dto';
import { ForumService } from './forum.service';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('posts')
  listPosts(@Query() query: ForumPostsQueryDto) {
    return this.forumService.listPosts(query);
  }

  @Get('posts/:postId')
  getPost(@Param('postId') postId: string) {
    return this.forumService.getPostById(postId);
  }

  @Get('posts/:postId/comments')
  listComments(@Param('postId') postId: string) {
    return this.forumService.listComments(postId);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@CurrentUser() user: User, @Body() dto: CreatePostDto) {
    return this.forumService.createPost(user.id, dto);
  }

  @Patch('posts/:postId')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.forumService.updatePost(user, postId, dto);
  }

  @Delete('posts/:postId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archivePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
  ): Promise<void> {
    await this.forumService.archivePost(user, postId);
  }

  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forumService.createComment(user.id, postId, dto);
  }

  @Patch('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  updateComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.forumService.updateComment(user, commentId, dto);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
  ): Promise<void> {
    await this.forumService.deleteComment(user, commentId);
  }

  @Post('posts/:postId/vote')
  @UseGuards(JwtAuthGuard)
  votePost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() dto: VoteDto,
  ) {
    return this.forumService.votePost(user.id, postId, dto.value);
  }

  @Post('comments/:commentId/vote')
  @UseGuards(JwtAuthGuard)
  voteComment(
    @CurrentUser() user: User,
    @Param('commentId') commentId: string,
    @Body() dto: VoteDto,
  ) {
    return this.forumService.voteComment(user.id, commentId, dto.value);
  }
}
