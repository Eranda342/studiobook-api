import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const message = customMessage || 'Request successful';

    return next.handle().pipe(
      map((res: unknown) => {
        if (res === undefined) {
          return {
            success: true,
            message,
            data: null,
          };
        }

        if (isRecord(res)) {
          if (typeof res.success === 'boolean') {
            return res;
          }

          if ('data' in res && 'meta' in res) {
            return {
              success: true,
              message,
              data: res.data,
              meta: res.meta,
            };
          }

          if (
            'message' in res &&
            typeof res.message === 'string' &&
            Object.keys(res).length === 1
          ) {
            return {
              success: true,
              message: res.message,
              data: null,
            };
          }
        }

        return {
          success: true,
          message,
          data: res,
        };
      }),
    );
  }
}
