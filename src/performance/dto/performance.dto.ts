import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PerformanceEventItemDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsString()
  kind: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientTimestamp?: string;
}

export class PerformanceEventsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerformanceEventItemDto)
  events: PerformanceEventItemDto[];
}

export class PerformanceDashboardQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  hours?: number;
}
