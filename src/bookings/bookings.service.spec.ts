/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, Prisma, Service } from '@prisma/client';

// ---------------------------------------------------------------------------
// Typed mock factory helpers
// ---------------------------------------------------------------------------

/** Build a minimal Booking shape accepted by mockResolvedValue. */
function mockBooking(
  overrides: Partial<Booking & { service?: Partial<Service> }>,
): Booking & { service?: Service } {
  const base: Booking = {
    id: 'booking-id',
    customerName: 'Customer',
    customerEmail: 'customer@example.com',
    customerPhone: null,
    serviceId: 'service-id',
    bookingDate: new Date(),
    bookingTime: '10:00',
    status: BookingStatus.PENDING,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const { service, ...rest } = overrides;
  const merged: Booking = { ...base, ...rest };
  if (service !== undefined) {
    return { ...merged, service: service as Service };
  }
  return merged;
}

/** Build a minimal Service shape. */
function mockService(overrides: Partial<Service>): Service {
  return {
    id: 'service-id',
    title: 'Test Service',
    description: 'Desc',
    duration: 60,
    price: new Prisma.Decimal('100.00'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
      jest.mocked(prisma.service.findUnique).mockResolvedValue(null);
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
      jest
        .mocked(prisma.service.findUnique)
        .mockResolvedValue(mockService({ isActive: false }));
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
      jest
        .mocked(prisma.service.findUnique)
        .mockResolvedValue(mockService({ isActive: true }));
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
      jest
        .mocked(prisma.service.findUnique)
        .mockResolvedValue(mockService({ isActive: true }));
      jest
        .mocked(prisma.booking.findFirst)
        .mockResolvedValue(mockBooking({ id: 'existing' }));
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
      jest
        .mocked(prisma.service.findUnique)
        .mockResolvedValue(mockService({ isActive: true }));
      jest.mocked(prisma.booking.findFirst).mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const bookingDate = futureDate.toISOString().slice(0, 10);

      jest.mocked(prisma.booking.create).mockResolvedValue(
        mockBooking({
          id: 'booking1',
          status: BookingStatus.PENDING,
          service: { price: new Prisma.Decimal('100.50') },
        }),
      );

      const result = await service.create({
        customerName: 'Test',
        customerEmail: 'test@example.com',
        serviceId: '1',
        bookingDate,
        bookingTime: '10:00',
      });

      expect(jest.mocked(prisma.booking.create)).toHaveBeenCalled();

      expect(
        (result as unknown as { service: { price: number } }).service.price,
      ).toBe(100.5);
    });

    it('should convert Prisma P2002 to ConflictException', async () => {
      jest
        .mocked(prisma.service.findUnique)
        .mockResolvedValue(mockService({ isActive: true }));
      jest.mocked(prisma.booking.findFirst).mockResolvedValue(null);
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
      jest.mocked(prisma.booking.create).mockRejectedValue(error);

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
      jest.mocked(prisma.booking.count).mockResolvedValue(15);
      jest.mocked(prisma.booking.findMany).mockResolvedValue([]);

      const result = await service.findAll({ page: 2, limit: 10 });
      expect(jest.mocked(prisma.booking.findMany)).toHaveBeenCalledWith(
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
      jest.mocked(prisma.booking.count).mockResolvedValue(0);
      jest.mocked(prisma.booking.findMany).mockResolvedValue([]);

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

      expect(jest.mocked(prisma.booking.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(jest.mocked(prisma.booking.count)).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException if missing', async () => {
      jest.mocked(prisma.booking.findUnique).mockResolvedValue(null);
      await expect(
        service.updateStatus('1', { status: BookingStatus.CONFIRMED }),
      ).rejects.toThrow(new NotFoundException('Booking with ID 1 not found'));
    });

    it('should throw BadRequestException if updating completed booking', async () => {
      jest
        .mocked(prisma.booking.findUnique)
        .mockResolvedValue(mockBooking({ status: BookingStatus.COMPLETED }));
      await expect(
        service.updateStatus('1', { status: BookingStatus.CONFIRMED }),
      ).rejects.toThrow(
        new BadRequestException(
          'Completed bookings cannot be updated to another status',
        ),
      );
    });

    it('should throw BadRequestException if updating cancelled to completed', async () => {
      jest
        .mocked(prisma.booking.findUnique)
        .mockResolvedValue(mockBooking({ status: BookingStatus.CANCELLED }));
      await expect(
        service.updateStatus('1', { status: BookingStatus.COMPLETED }),
      ).rejects.toThrow(
        new BadRequestException(
          'Cancelled bookings cannot be marked as completed',
        ),
      );
    });

    it('should correctly update status', async () => {
      jest
        .mocked(prisma.booking.findUnique)
        .mockResolvedValue(mockBooking({ status: BookingStatus.PENDING }));
      jest.mocked(prisma.booking.update).mockResolvedValue(
        mockBooking({
          status: BookingStatus.CONFIRMED,
          service: { price: new Prisma.Decimal('10') },
        }),
      );

      const result = await service.updateStatus('1', {
        status: BookingStatus.CONFIRMED,
      });
      expect(jest.mocked(prisma.booking.update)).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: BookingStatus.CONFIRMED },
        include: { service: true },
      });
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('cancel', () => {
    it('should throw BadRequestException if booking is completed', async () => {
      jest
        .mocked(prisma.booking.findUnique)
        .mockResolvedValue(mockBooking({ status: BookingStatus.COMPLETED }));
      await expect(service.cancel('1')).rejects.toThrow(
        new BadRequestException('Completed bookings cannot be cancelled'),
      );
    });

    it('should correctly cancel booking', async () => {
      jest
        .mocked(prisma.booking.findUnique)
        .mockResolvedValue(mockBooking({ status: BookingStatus.PENDING }));
      jest.mocked(prisma.booking.update).mockResolvedValue(
        mockBooking({
          status: BookingStatus.CANCELLED,
          service: { price: new Prisma.Decimal('10') },
        }),
      );

      const result = await service.cancel('1');
      expect(jest.mocked(prisma.booking.update)).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: BookingStatus.CANCELLED },
        include: { service: true },
      });
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });
});
