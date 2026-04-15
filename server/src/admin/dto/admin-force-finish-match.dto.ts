import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminForceFinishMatchDto {
  @IsIn(['draw', 'win'])
  result!: 'draw' | 'win';

  @IsOptional()
  @IsUUID()
  winnerId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
