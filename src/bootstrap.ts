import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function getUploadRoot() {
  return (
    process.env.UPLOAD_ROOT ??
    (process.env.VERCEL
      ? join('/tmp', 'uploads')
      : join(process.cwd(), 'uploads'))
  );
}

export function ensureUploadsDir() {
  const uploadsDir = getUploadRoot();
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

export function configureApp(app: NestExpressApplication) {
  const uploadsDir = ensureUploadsDir();

  app.setGlobalPrefix('v1');
  app.useStaticAssets(uploadsDir, { prefix: '/media/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();
}
