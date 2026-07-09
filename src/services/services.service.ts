import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapService(service: Service) {
    return {
      ...service,
      price: service.price.toNumber(),
    };
  }

  async create(createServiceDto: CreateServiceDto) {
    const existing = await this.prisma.service.findFirst({
      where: {
        title: {
          equals: createServiceDto.title,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException('A service with this title already exists');
    }

    const service = await this.prisma.service.create({
      data: createServiceDto,
    });

    return this.mapService(service);
  }

  async findAll(includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };
    const services = await this.prisma.service.findMany({ where });
    return services.map((s) => this.mapService(s));
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return this.mapService(service);
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    await this.findOne(id);

    if (updateServiceDto.title) {
      const existing = await this.prisma.service.findFirst({
        where: {
          title: {
            equals: updateServiceDto.title,
            mode: 'insensitive',
          },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('A service with this title already exists');
      }
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
    });

    return this.mapService(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const bookingCount = await this.prisma.booking.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      throw new BadRequestException(
        'Cannot delete service with existing bookings',
      );
    }

    await this.prisma.service.delete({
      where: { id },
    });

    return { message: 'Service deleted successfully' };
  }
}
