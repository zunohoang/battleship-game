import { IsIn, IsInt } from 'class-validator';

export class VoteDto {
  @IsInt({ message: 'FORUM_VOTE_INVALID' })
  @IsIn([-1, 1], { message: 'FORUM_VOTE_INVALID' })
  value: -1 | 1;
}
