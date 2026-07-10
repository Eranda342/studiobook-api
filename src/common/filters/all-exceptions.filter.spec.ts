import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockRequest = { url: '/api/test' };
    const mockResponse = { status: mockStatus };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;

    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('should format ordinary HttpException with string message', () => {
    const exception = new HttpException(
      'Bad request thing',
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad request thing',
        path: '/api/test',
      }),
    );
    expect(typeof mockJson.mock.calls[0][0].timestamp).toBe('string');
  });

  it('should format Validation exception properly (array of messages)', () => {
    const responsePayload = {
      message: ['must be a string', 'must not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    };
    const exception = new HttpException(
      responsePayload,
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: ['must be a string', 'must not be empty'],
        path: '/api/test',
      }),
    );
  });

  it('should format UnauthorizedException', () => {
    const exception = new UnauthorizedException('Invalid token');

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid token',
        path: '/api/test',
      }),
    );
  });

  it('should format unknown Error as 500', () => {
    const exception = new Error('Database connection lost');

    filter.catch(exception, mockArgumentsHost);

    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    const payload = mockJson.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        path: '/api/test',
      }),
    );
    expect(payload.errors).toBeUndefined();
    expect(payload.stack).toBeUndefined();
    expect(payload.message).not.toContain('Database connection lost');
  });

  it('should format object response without a valid message', () => {
    const responsePayload = { foo: 'bar' };
    const exception = new HttpException(
      responsePayload,
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Request failed',
        path: '/api/test',
      }),
    );
  });

  it('should format unknown non-Error value', () => {
    const exception = 'Random string thrown';

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
      }),
    );
  });
});
