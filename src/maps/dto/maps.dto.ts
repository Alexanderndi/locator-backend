import { Type } from 'class-transformer';
import { IsNumber, IsUUID } from 'class-validator';

export class RouteRequestDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @IsUUID()
  toVendorId: string;
}
