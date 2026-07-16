import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class TrackEventDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class TrackEventItemDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientTimestamp?: string;
}

export class TrackEventsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackEventItemDto)
  events: TrackEventItemDto[];
}

export class SearchAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
