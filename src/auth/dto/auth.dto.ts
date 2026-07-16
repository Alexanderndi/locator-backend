import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class RegisterVendorDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter and one number',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsUUID()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  boothNumber?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  longitude: number;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class OtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[\d\s+\-()]+$/, {
    message: 'Phone number contains invalid characters',
  })
  phone: string;
}

export class OtpVerifyDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  code: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
