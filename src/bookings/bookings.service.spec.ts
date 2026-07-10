import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, BookingStatus } from '@prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const prismaServiceMock = {
      service: {
        findUnique: jest.fn(),
      },
      booking: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException if service is missing', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await expect(
        service.create({
          customerName: 'Test',
          customerEmail: 'test@example.com',
          serviceId: '1',
          bookingDate: futureDate.toISOString().slice(0, 10),
          bookingTime: '10:00',
        }),
      ).rejects.toThrow(new NotFoundException('Service not found'));
    });

    it('should throw BadRequestException if service is inactive', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: '1',
        isActive: false,
      } as any);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await expect(
        service.create({
          customerName: 'Test',
          customerEmail: 'test@example.com',
          serviceId: '1',
          bookingDate: futureDate.toISOString().slice(0, 10),
          bookingTime: '10:00',
        }),
      ).rejects.toThrow(
        new BadRequestException('Cannot book an inactive service'),
      );
    });

    it('should throw BadRequestException for past booking date', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: '1',
        isActive: true,
      } as any);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      await expect(
        service.create({
          customerName: 'Test',
          customerEmail: 'test@example.com',
          serviceId: '1',
          bookingDate: pastDate.toISOString().slice(0, 10),
          bookingTime: '10:00',
        }),
      ).rejects.toThrow(
        new BadRequestException('Booking date cannot be in the past'),
      );
    });

    it('should throw ConflictException if duplicate slot exists', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: '1',
        isActive: true,
      } as any);
      prisma.booking.findFirst.mockResolvedValue({ id: '2' } as any);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await expect(
        service.create({
          customerName: 'Test',
          customerEmail: 'test@example.com',
          serviceId: '1',
          bookingDate: futureDate.toISOString().slice(0, 10),
          bookingTime: '10:00',
        }),
      ).rejects.toThrow(
        new ConflictException(
          'This service is already booked for the selected date and time',
        ),
      );
    });

    it('should create valid booking and map Decimal service price', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: '1',
        isActive: true,
      } as any);
      prisma.booking.findFirst.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const bookingDate = futureDate.toISOString().slice(0, 10);

      const createdBooking = {
        id: 'booking1',
        customerName: 'Test',
        customerEmail: 'test@example.com',
        serviceId: '1',
        bookingDate,
        bookingTime: '10:00',
        status: BookingStatus.PENDING,
        service: {
          price: new Prisma.Decimal('100.50'),
        },
      };
      prisma.booking.create.mockResolvedValue(createdBooking as any);

      const result = await service.create({
        customerName: 'Test',
        customerEmail: 'test@example.com',
        serviceId: '1',
        bookingDate,
        bookingTime: '10:00',
      });

      expect(prisma.booking.create).toHaveBeenCalled();
      expect(result.service.price).toBe(100.5);
    });

    it('should convert Prisma P2002 to ConflictException', async () => {
      prisma.service.findUnique.mockResolvedValue({
        id: '1',
        isActive: true,
      } as any);
      prisma.booking.findFirst.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint violation',
        {
          code: 'P2002',
          clientVersion: '7.8.0',
          meta: {},
        },
      );
      prisma.booking.create.mockRejectedValue(error);

      await expect(
        service.create({
          customerName: 'Test',
          customerEmail: 'test@example.com',
          serviceId: '1',
          bookingDate: futureDate.toISOString().slice(0, 10),
          bookingTime: '10:00',
        }),
      ).rejects.toThrow(
        new ConflictException(
          'This service is already booked for the selected date and time',
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should use correct skip/take and calculate totalPages', async () => {
      prisma.booking.count.mockResolvedValue(15);
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.findAll({ page: 2, limit: 10 });
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
      });
    });

    it('should construct correct where structure for search and status', async () => {
      prisma.booking.count.mockResolvedValue(0);
      prisma.booking.findMany.mockResolvedValue([]);

      await service.findAll({
        page: 1,
        limit: 10,
        status: BookingStatus.CONFIRMED,
        search: 'john',
      });

      const expectedWhere = {
        status: BookingStatus.CONFIRMED,
        OR: [
          { customerName: { contains: 'john', mode: 'insensitive' } },
          { customerEmail: { contains: 'john', mode: 'insensitive' } },
        ],
      };

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.booking.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if missing', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('1', { status: BookingStatus.CONFIRMED }),
      ).rejects.toThrow(new NotFoundException('Booking with ID 1 not found'));
    });

    it('should throw BadRequestException if updating completed booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.COMPLETED,
      } as any);
      await expect(
        service.updateStatus('1', { status: BookingStatus.CONFIRMED }),
      ).rejects.toThrow(
        new BadRequestException(
          'Completed bookings cannot be updated to another status',
        ),
      );
    });

    it('should throw BadRequestException if updating cancelled to completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.CANCELLED,
      } as any);
      await expect(
        service.updateStatus('1', { status: BookingStatus.COMPLETED }),
      ).rejects.toThrow(
        new BadRequestException(
          'Cancelled bookings cannot be marked as completed',
        ),
      );
    });

    it('should correctly update status', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.PENDING,
      } as any);
      prisma.booking.update.mockResolvedValue({
        status: BookingStatus.CONFIRMED,
        service: { price: new Prisma.Decimal('10') },
      } as any);

      const result = await service.updateStatus('1', {
        status: BookingStatus.CONFIRMED,
      });
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: BookingStatus.CONFIRMED },
        include: { service: true },
      });
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('should throw BadRequestException if booking is completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.COMPLETED,
      } as any);
      await expect(service.cancel('1')).rejects.toThrow(
        new BadRequestException('Completed bookings cannot be cancelled'),
      );
    });

    it('should correctly cancel booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        status: BookingStatus.PENDING,
      } as any);
      prisma.booking.update.mockResolvedValue({
        status: BookingStatus.CANCELLED,
        service: { price: new Prisma.Decimal('10') },
      } as any);

      const result = await service.cancel('1');
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: BookingStatus.CANCELLED },
        include: { service: true },
      });
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });
});
