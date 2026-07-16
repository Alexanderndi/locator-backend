import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import { Event } from '../entities/event.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { OtpCode } from '../entities/otp-code.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { EventStatus, UserRole } from '../common/enums';
import { buildQrPayload } from '../common/utils/qr.util';
import { assertUniqueBooth } from '../common/utils/booth.util';
import { isValidPhone, normalizePhone } from '../common/utils/phone.util';
import {
  RegisterDto,
  RegisterVendorDto,
  LoginDto,
  OtpRequestDto,
  OtpVerifyDto,
} from './dto/auth.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(OtpCode)
    private readonly otpRepository: Repository<OtpCode>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const phone = normalizePhone(dto.phone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException(
        'Enter a valid phone number with country code',
      );
    }

    const existingPhone = await this.userRepository.findOne({
      where: { phone, deletedAt: IsNull() },
    });
    if (existingPhone) {
      throw new ConflictException(
        'An account with this phone number already exists',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email,
      passwordHash,
      displayName: dto.displayName.trim(),
      phone,
      role: UserRole.VISITOR,
    });
    await this.userRepository.save(user);

    await this.preferenceRepository.save(
      this.preferenceRepository.create({
        userId: user.id,
        readNotificationIds: [],
      }),
    );

    const tokens = await this.issueTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
      message: 'Account created successfully',
    };
  }

  async registerVendor(dto: RegisterVendorDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const event = await this.eventRepository.findOne({
      where: { id: dto.eventId },
      relations: ['venue'],
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (![EventStatus.ACTIVE, EventStatus.PUBLISHED].includes(event.status)) {
      throw new BadRequestException(
        'This event is not open for vendor registration',
      );
    }

    const slug = await this.uniqueVendorSlug(dto.eventId, dto.businessName);
    await assertUniqueBooth(
      this.vendorRepository,
      dto.eventId,
      dto.boothNumber,
    );

    const latitude = dto.latitude ?? Number(event.venue?.latitude ?? 5.0379);
    const longitude = dto.longitude ?? Number(event.venue?.longitude ?? 7.9128);

    const vendor = await this.vendorRepository.save(
      this.vendorRepository.create({
        eventId: dto.eventId,
        name: dto.businessName.trim(),
        slug,
        categoryId: dto.categoryId ?? null,
        description: dto.description?.trim() ?? null,
        boothNumber: dto.boothNumber?.trim() ?? null,
        zone: dto.zone?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        email: dto.email.toLowerCase(),
        latitude,
        longitude,
        isActive: true,
      }),
    );

    const secret = this.configService.get<string>('qr.hmacSecret') ?? '';
    vendor.qrCodePayload = buildQrPayload(vendor.eventId, vendor.id, secret);
    await this.vendorRepository.save(vendor);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userRepository.save(
      this.userRepository.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName.trim(),
        role: UserRole.VENDOR,
        vendorId: vendor.id,
      }),
    );

    await this.preferenceRepository.save(
      this.preferenceRepository.create({
        userId: user.id,
        readNotificationIds: [],
      }),
    );

    const tokens = await this.issueTokens(user);
    return {
      user: this.sanitizeUser(user),
      vendor: {
        id: vendor.id,
        name: vendor.name,
        eventId: vendor.eventId,
      },
      ...tokens,
      message: 'Vendor account created successfully',
    };
  }

  private async uniqueVendorSlug(eventId: string, businessName: string) {
    const base =
      businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'vendor';

    let slug = base;
    let suffix = 1;
    while (
      await this.vendorRepository.findOne({
        where: { eventId, slug },
      })
    ) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.issueTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    stored.isRevoked = true;
    await this.refreshTokenRepository.save(stored);

    const user = stored.user;
    if (user.deletedAt) {
      throw new UnauthorizedException('User account deleted');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(refreshToken: string) {
    const stored = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });
    if (stored) {
      stored.isRevoked = true;
      await this.refreshTokenRepository.save(stored);
    }
    return { message: 'Logged out successfully' };
  }

  async requestOtp(dto: OtpRequestDto) {
    const phone = normalizePhone(dto.phone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException(
        'Enter a valid phone number with country code',
      );
    }

    const cooldownMs = 60 * 1000;
    const latest = await this.otpRepository.findOne({
      where: { phone },
      order: { createdAt: 'DESC' },
    });
    if (latest) {
      const elapsed = Date.now() - latest.createdAt.getTime();
      if (elapsed < cooldownMs) {
        const resendIn = Math.ceil((cooldownMs - elapsed) / 1000);
        throw new HttpException(
          {
            type: 'https://api.fvl.io/errors/429',
            title: 'Too Many Requests',
            status: HttpStatus.TOO_MANY_REQUESTS,
            detail: 'Please wait before requesting another OTP',
            resendIn,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({
        phone,
        code,
        expiresAt,
      }),
    );

    console.log(`[OTP] Phone: ${phone}, Code: ${code} (expires in 10 min)`);
    return {
      message: 'OTP sent successfully',
      expiresIn: 600,
      resendIn: 60,
      phone,
    };
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const phone = normalizePhone(dto.phone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException(
        'Enter a valid phone number with country code',
      );
    }

    const otp = await this.otpRepository.findOne({
      where: { phone, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not found');
    }
    if (otp.attempts >= 5) {
      throw new BadRequestException('Too many OTP attempts');
    }
    if (otp.code !== dto.code) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new BadRequestException('Invalid OTP');
    }

    otp.isUsed = true;
    await this.otpRepository.save(otp);

    let user = await this.userRepository.findOne({
      where: { phone, deletedAt: IsNull() },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = this.userRepository.create({
        phone,
        displayName: dto.displayName?.trim() || `User ${phone.slice(-4)}`,
        role: UserRole.VISITOR,
      });
      await this.userRepository.save(user);
      await this.preferenceRepository.save(
        this.preferenceRepository.create({
          userId: user.id,
          readNotificationIds: [],
        }),
      );
    }

    const tokens = await this.issueTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
      isNewUser,
      message: isNewUser
        ? 'Account created successfully'
        : 'Signed in successfully',
    };
  }

  private async issueTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpires =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const expiresAt = this.parseExpiry(refreshExpires);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        token: refreshToken,
        expiresAt,
      }),
    );

    return { accessToken, refreshToken };
  }

  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(Date.now() + value * (multipliers[unit] ?? multipliers.d));
  }

  sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      vendorId: user.vendorId,
      createdAt: user.createdAt,
    };
  }
}
