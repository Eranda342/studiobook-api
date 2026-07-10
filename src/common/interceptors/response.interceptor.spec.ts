import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from './response.interceptor';
import { of, lastValueFrom } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    interceptor = new ResponseInterceptor(reflector);
  });

  const createMockExecutionContext = () => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should wrap standard object in data', async () => {
    const ctx = createMockExecutionContext();
    const next: CallHandler = { handle: () => of({ foo: 'bar' }) };
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual({
      success: true,
      message: 'Request successful',
      data: { foo: 'bar' },
    });
  });

  it('should wrap array in data', async () => {
    const ctx = createMockExecutionContext();
    const next: CallHandler = { handle: () => of(['item1', 'item2']) };
    reflector.getAllAndOverride.mockReturnValue('Items retrieved');

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual({
      success: true,
      message: 'Items retrieved',
      data: ['item1', 'item2'],
    });
  });

  it('should handle paginated { data, meta } properly', async () => {
    const ctx = createMockExecutionContext();
    const paginatedResponse = {
      data: ['item'],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    const next: CallHandler = { handle: () => of(paginatedResponse) };
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual({
      success: true,
      message: 'Request successful',
      data: ['item'],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });
    // Ensure original not mutated if not needed, though we just care about structure.
  });

  it('should format message-only object', async () => {
    const ctx = createMockExecutionContext();
    const next: CallHandler = {
      handle: () => of({ message: 'Deleted properly' }),
    };
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual({
      success: true,
      message: 'Deleted properly',
      data: null,
    });
  });

  it('should not wrap already wrapped success response', async () => {
    const ctx = createMockExecutionContext();
    const existing = { success: true, message: 'Existing' };
    const next: CallHandler = { handle: () => of(existing) };
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual(existing);
  });

  it('should return data: null for undefined', async () => {
    const ctx = createMockExecutionContext();
    const next: CallHandler = { handle: () => of(undefined) };
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual({
      success: true,
      message: 'Request successful',
      data: null,
    });
  });

  it('should respect custom @ResponseMessage metadata', async () => {
    const ctx = createMockExecutionContext();
    const next: CallHandler = { handle: () => of({ id: 1 }) };
    reflector.getAllAndOverride.mockReturnValue('Custom message');

    const result = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(result).toEqual({
      success: true,
      message: 'Custom message',
      data: { id: 1 },
    });
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      RESPONSE_MESSAGE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
  });
});
