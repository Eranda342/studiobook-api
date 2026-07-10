import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaServiceMock = {
      service: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      booking: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a valid service and map Prisma Decimal price to a number', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      const createdService = {
        id: '1',
        title: 'New Service',
        description: 'Desc',
        duration: 60,
        price: new Prisma.Decimal('75.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.service.create.mockResolvedValue(createdService as any);

      const result = await service.create({
        title: 'New Service',
        description: 'Desc',
        duration: 60,
        price: 75.0,
        isActive: true,
      });

      expect(prisma.service.create).toHaveBeenCalled();
      expect(result.price).toBe(75);
    });

    it('should throw ConflictException on case-insensitive duplicate title', async () => {
      const existingService = {
        id: '1',
        title: 'new service',
        description: 'Desc',
        duration: 60,
        price: new Prisma.Decimal('75.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.service.findFirst.mockResolvedValue(existingService as any);

      await expect(
        service.create({
          title: 'New Service',
          description: 'Desc',
          duration: 60,
          price: 75.0,
        }),
      ).rejects.toThrow(
        new ConflictException('A service with this title already exists'),
      );
    });
  });

  describe('findAll', () => {
    it('should default list filter to { isActive: true }', async () => {
      prisma.service.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should not apply active filter if includeInactive is true', async () => {
      prisma.service.findMany.mockResolvedValue([]);
      await service.findAll(true);
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {},
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if service is missing', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(
        new NotFoundException('Service with ID 1 not found'),
      );
    });
  });

  describe('update', () => {
    it('should throw ConflictException when another service has the same title', async () => {
      const existingService = {
        id: '1',
        title: 'Original Title',
        description: 'Desc',
        duration: 60,
        price: new Prisma.Decimal('75.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const duplicateService = {
        id: '2',
        title: 'new title',
        description: 'Desc',
        duration: 60,
        price: new Prisma.Decimal('75.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.service.findUnique.mockResolvedValue(existingService as any);
      prisma.service.findFirst.mockResolvedValue(duplicateService as any);

      await expect(
        service.update('1', { title: 'New Title' }),
      ).rejects.toThrow(
        new ConflictException('A service with this title already exists'),
      );

      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: {
          title: { equals: 'New Title', mode: 'insensitive' },
          id: { not: '1' },
        },
      });
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if service has bookings and not call Prisma delete', async () => {
      const existingService = {
        id: '1',
        title: 'Service',
        description: 'Desc',
        duration: 60,
        price: new Prisma.Decimal('75.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.service.findUnique.mockResolvedValue(existingService as any);
      prisma.booking.count.mockResolvedValue(1);

      await expect(service.remove('1')).rejects.toThrow(
        new BadRequestException('Cannot delete service with existing bookings'),
      );
      expect(prisma.service.delete).not.toHaveBeenCalled();
    });

    it('should delete service and return success message if no bookings exist', async () => {
      const existingService = {
        id: '1',
        title: 'Service',
        description: 'Desc',
        duration: 60,
        price: new Prisma.Decimal('75.00'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.service.findUnique.mockResolvedValue(existingService as any);
      prisma.booking.count.mockResolvedValue(0);

      const result = await service.remove('1');
      expect(prisma.service.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual({ message: 'Service deleted successfully' });
    });
  });
});
