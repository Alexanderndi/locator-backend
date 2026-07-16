import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementPriority } from '../../common/enums';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  boothNumber?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  boothNumber?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkImportVendorRowDto extends CreateVendorDto {
  @IsOptional()
  @IsString()
  categoryName?: string;
}

export class BulkImportVendorsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportVendorRowDto)
  vendors: BulkImportVendorRowDto[];
}

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @IsOptional()
  expiresAt?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @IsOptional()
  expiresAt?: string | null;
}

export class CreateContactConsentAdminDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;
}
