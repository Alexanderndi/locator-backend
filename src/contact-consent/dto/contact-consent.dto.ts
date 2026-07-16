import { IsEmail, IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateContactConsentDto {
  @IsUUID()
  eventId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEmail()
  userEmail?: string;
}

export class RespondContactConsentDto {
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}
