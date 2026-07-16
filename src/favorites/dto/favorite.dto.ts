import { IsOptional, IsUUID } from 'class-validator';

export class AddFavoriteDto {
  @IsUUID()
  vendorId: string;

  @IsUUID()
  eventId: string;
}

export class FavoritesQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;
}
