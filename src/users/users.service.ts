import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { AuthService } from '../auth/auth.service';
import {
  UpdateUserDto,
  DeleteUserDto,
  UpdatePreferencesDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    private readonly authService: AuthService,
  ) {}

  getProfile(user: User) {
    return this.authService.sanitizeUser(user);
  }

  async updateProfile(user: User, dto: UpdateUserDto) {
    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName.trim();
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl?.trim() || null;
    }
    await this.userRepository.save(user);
    return this.authService.sanitizeUser(user);
  }

  async getPreferences(userId: string) {
    let pref = await this.preferenceRepository.findOne({
      where: { userId },
    });
    if (!pref) {
      pref = await this.preferenceRepository.save(
        this.preferenceRepository.create({
          userId,
          readNotificationIds: [],
        }),
      );
    }
    return {
      pushEnabled: pref.pushEnabled,
      emailEnabled: pref.emailEnabled,
      favoriteCategories: pref.favoriteCategories ?? [],
      readNotificationIds: pref.readNotificationIds ?? [],
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    let pref = await this.preferenceRepository.findOne({ where: { userId } });
    if (!pref) {
      pref = this.preferenceRepository.create({
        userId,
        readNotificationIds: [],
      });
    }
    if (dto.pushEnabled !== undefined) pref.pushEnabled = dto.pushEnabled;
    if (dto.emailEnabled !== undefined) pref.emailEnabled = dto.emailEnabled;
    if (dto.favoriteCategories !== undefined) {
      pref.favoriteCategories = dto.favoriteCategories;
    }
    await this.preferenceRepository.save(pref);
    return this.getPreferences(userId);
  }

  async softDelete(user: User, dto: DeleteUserDto) {
    if (!user.passwordHash) {
      throw new UnauthorizedException('Password confirmation required');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid password');
    }
    await this.userRepository.softRemove(user);
    return { message: 'Account deleted successfully' };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
