import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, Prisma, Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapBooking(booking: Booking & { service?: Service }) {
    if (booking.service && booking.service.price) {
      return {
        ...booking,
        service: {
          ...booking.service,
          price: booking.service.price.toNumber(),
        },
      };
    }
    return booking;
  }

  async create(createBookingDto: CreateBookingDto) {
    const { serviceId, bookingDate, bookingTime } = createBookingDto;

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.isActive) {
      throw new BadRequestException('Cannot book an inactive service');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bDate = new Date(bookingDate);
    bDate.setHours(0, 0, 0, 0);

    if (bDate < today) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    const existing = await this.prisma.booking.findFirst({
      where: {
        serviceId,
        bookingDate: bDate,
        bookingTime,
      },
    });

    if (existing) {
      throw new ConflictException(
        'This service is already booked for the selected date and time',
      );
    }

    try {
      const booking = await this.prisma.booking.create({
        data: {
          ...createBookingDto,
          bookingDate: bDate,
        },
        include: { service: true },
      });

      return this.mapBooking(booking);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'This service is already booked for the selected date and time',
          );
        }
      }
      throw error;
    }
  }

  async findAll(query: QueryBookingsDto) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { service: true },
      }),
    ]);

    return {
      data: bookings.map((b) => this.mapBooking(b)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return this.mapBooking(booking);
  }

  async updateStatus(id: string, updateDto: UpdateBookingStatusDto) {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException(
        'Completed bookings cannot be updated to another status',
      );
    }

    if (
      booking.status === BookingStatus.CANCELLED &&
      updateDto.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cancelled bookings cannot be marked as completed',
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: updateDto.status },
      include: { service: true },
    });

    return this.mapBooking(updated);
  }

  async cancel(id: string) {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Completed bookings cannot be cancelled');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { service: true },
    });

    return this.mapBooking(updated);
  }
}
