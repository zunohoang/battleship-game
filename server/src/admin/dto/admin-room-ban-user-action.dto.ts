import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AdminRoomBanUserActionDto {
  @IsUUID()
  userId!: string;

  @IsIn(['temporary', 'permanent'])
  type!: 'temporary' | 'permanent';

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : value,
  )
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
