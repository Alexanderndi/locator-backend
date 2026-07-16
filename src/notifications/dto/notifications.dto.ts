import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class RevokeDeviceTokenDto {
  @IsOptional()
  @IsString()
  token?: string;
}

export class CreateReminderDto {
  @IsUUID()
  vendorId: string;

  @IsUUID()
  eventId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  message?: string;
}
