import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class VendorRequestConsentDto {
  @IsEmail()
  userEmail: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;
}
