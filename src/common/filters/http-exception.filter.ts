import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let type = 'https://api.fvl.io/errors/internal';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        detail = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as Record<string, unknown>;
        detail =
          (obj.message as string) ||
          (Array.isArray(obj.message)
            ? (obj.message as string[]).join(', ')
            : detail);
        title = (obj.error as string) || title;
      }
      type = `https://api.fvl.io/errors/${status}`;
      title = this.titleForStatus(status);
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    response.status(status).json({
      type,
      title,
      status,
      detail,
      instance: request.url,
    });
  }

  private titleForStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Validation Error',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return map[status] ?? 'Error';
  }
}
