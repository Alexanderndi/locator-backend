import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { getUploadRoot } from '../bootstrap';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

@Injectable()
export class MediaService {
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = getUploadRoot();
    for (const folder of ['catalogue', 'chat']) {
      const dir = join(this.uploadRoot, folder);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  assertImageMime(mimeType?: string | null) {
    const normalized = (mimeType ?? '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(normalized)) {
      throw new BadRequestException(
        'Catalogue supports images only (JPEG, PNG, WebP)',
      );
    }
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
  }

  saveCatalogueImage(file: Express.Multer.File): {
    imageUrl: string;
    mimeType: string;
  } {
    return this.saveImage(file, 'catalogue');
  }

  saveChatImage(file: Express.Multer.File): {
    imageUrl: string;
    mimeType: string;
  } {
    return this.saveImage(file, 'chat');
  }

  private saveImage(
    file: Express.Multer.File,
    folder: 'catalogue' | 'chat',
  ): { imageUrl: string; mimeType: string } {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const mimeType = this.assertImageMime(file.mimetype);
    const ext =
      EXT_BY_MIME[mimeType] ??
      (extname(file.originalname || '').toLowerCase() || '.jpg');
    const filename = `${randomUUID()}${ext}`;
    const absolutePath = join(this.uploadRoot, folder, filename);
    writeFileSync(absolutePath, file.buffer);

    return {
      imageUrl: `/media/${folder}/${filename}`,
      mimeType,
    };
  }

  deleteCatalogueImage(imageUrl?: string | null) {
    this.deleteImage(imageUrl, 'catalogue');
  }

  deleteChatImage(imageUrl?: string | null) {
    this.deleteImage(imageUrl, 'chat');
  }

  private deleteImage(imageUrl: string | null | undefined, folder: string) {
    if (!imageUrl || !imageUrl.startsWith(`/media/${folder}/`)) return;
    const filename = imageUrl.replace(`/media/${folder}/`, '');
    if (!filename || filename.includes('..') || filename.includes('/')) return;
    const absolutePath = join(this.uploadRoot, folder, filename);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }
  }

  toPublicUrl(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const origin =
      this.configService.get<string>('PUBLIC_API_ORIGIN') ??
      `http://localhost:${this.configService.get<number>('PORT') ?? 3000}`;
    return `${origin.replace(/\/+$/, '')}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
}
