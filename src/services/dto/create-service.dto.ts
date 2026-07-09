import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({
    description: 'The title of the service',
    example: 'Podcast Recording Session',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  title: string;

  @ApiProperty({
    description: 'A detailed description of the service',
    example: 'Professional recording with studio-grade microphones.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiProperty({
    description: 'Duration of the service in minutes',
    minimum: 15,
    example: 60,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(15)
  duration: number;

  @ApiProperty({
    description: 'Price of the service in USD',
    minimum: 0,
    example: 50.0,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Whether the service is active and bookable',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
