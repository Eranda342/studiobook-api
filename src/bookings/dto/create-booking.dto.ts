import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Customer Name', example: 'Alex Carter' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  customerName: string;

  @ApiProperty({ description: 'Customer Email', example: 'alex@example.com' })
  @IsEmail()
  @IsNotEmpty()
  customerEmail: string;

  @ApiPropertyOptional({
    description: 'Customer Phone',
    example: '+94771234567',
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({
    description: 'Service ID to book',
    example: 'd3f6a27f-1d48-4c91-a1b7-ec7908b98b04',
  })
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    description: 'Booking Date in ISO format',
    example: '2026-07-20',
  })
  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiProperty({
    description: 'Booking Time in HH:mm 24-hour format',
    example: '14:00',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'bookingTime must be in HH:mm format',
  })
  bookingTime: string;

  @ApiPropertyOptional({
    description: 'Optional notes for the booking',
    example: 'Need two microphones.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
