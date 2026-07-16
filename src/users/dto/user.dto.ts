import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Display name cannot be empty' })
  @MinLength(2, { message: 'Display name must be at least 2 characters' })
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Avatar must be a valid image URL' })
  avatarUrl?: string;
}

export class DeleteUserDto {
  @IsString()
  @MinLength(1)
  password: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteCategories?: string[];
}
