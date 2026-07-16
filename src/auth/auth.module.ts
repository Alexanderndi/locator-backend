import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import { Event } from '../entities/event.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { OtpCode } from '../entities/otp-code.entity';
import { UserPreference } from '../entities/user-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Vendor,
      Event,
      RefreshToken,
      OtpCode,
      UserPreference,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? 'fvl-dev-jwt-secret',
        signOptions: {
          expiresIn: (config.get<string>('jwt.accessExpiresIn') ??
            '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
