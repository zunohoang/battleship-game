import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class BoardConfigDto {
  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(5, { message: 'PAGINATION_INVALID' })
  @Max(20, { message: 'PAGINATION_INVALID' })
  rows: number;

  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(5, { message: 'PAGINATION_INVALID' })
  @Max(20, { message: 'PAGINATION_INVALID' })
  cols: number;
}

class ShotDto {
  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(0, { message: 'PAGINATION_INVALID' })
  x: number;

  @IsInt({ message: 'PAGINATION_INVALID' })
  @Min(0, { message: 'PAGINATION_INVALID' })
  y: number;

  @IsOptional()
  @IsBoolean({ message: 'PAGINATION_INVALID' })
  isHit?: boolean;
}

export class LlmBotShotRequestDto {
  @ValidateNested()
  @Type(() => BoardConfigDto)
  boardConfig: BoardConfigDto;

  @IsArray({ message: 'PAGINATION_INVALID' })
  @ValidateNested({ each: true })
  @Type(() => ShotDto)
  shots: ShotDto[];

  @IsArray({ message: 'PAGINATION_INVALID' })
  @IsInt({ each: true, message: 'PAGINATION_INVALID' })
  @Min(2, { each: true, message: 'PAGINATION_INVALID' })
  @Max(8, { each: true, message: 'PAGINATION_INVALID' })
  shipSizes: number[];
}
