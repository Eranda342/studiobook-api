import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const usersServiceMock = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const jwtServiceMock = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should hash the password with cost 10, call UsersService.create, and return user without password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      const createdUser = {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register({
        name: 'Test',
        email: 'test@example.com',
        password: 'plainPassword',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        name: 'Test',
        email: 'test@example.com',
        password: 'hashedPassword123',
      });
      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe('1');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    it('should return an access token for valid credentials', async () => {
      const user = {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('valid_token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'plainPassword',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'plainPassword',
        'hashedPassword123',
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'test@example.com',
      });
      expect(result).toEqual({ accessToken: 'valid_token' });
    });

    it('should throw UnauthorizedException if email is unknown', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'plainPassword',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      const user = {
        id: '1',
        name: 'Test',
        email: 'test@example.com',
        password: 'hashedPassword123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongPassword' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
