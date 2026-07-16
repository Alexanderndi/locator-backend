import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PerformanceService } from './performance.service';

@Injectable()
export class PerformanceLoggingInterceptor implements NestInterceptor {
  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method?: string; route?: { path?: string }; url?: string }>();
    const response = http.getResponse<{ statusCode?: number }>();
    const startedAt = Date.now();
    const route =
      request.route?.path ??
      request.url?.split('?')[0] ??
      'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          void this.performanceService.recordServerLatency(
            `${request.method ?? 'GET'} ${route}`,
            Date.now() - startedAt,
            response.statusCode ?? 200,
          );
        },
        error: () => {
          void this.performanceService.recordServerLatency(
            `${request.method ?? 'GET'} ${route}`,
            Date.now() - startedAt,
            response.statusCode ?? 500,
          );
        },
      }),
    );
  }
}
