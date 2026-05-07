import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class EntryEventDto {
  @ApiProperty()
  @IsString()
  plate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plateRaw?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class ExitEventDto {
  @ApiProperty()
  @IsString()
  plate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plateRaw?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  confidence?: number;

  @ApiProperty()
  @IsString()
  cameraId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  plateNumber: string;

  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class SessionFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plate?: string;
}

export class StatisticsDto {
  @ApiProperty()
  activeSessions: number;

  @ApiProperty()
  todayRevenue: number;

  @ApiProperty()
  todayEntries: number;

  @ApiProperty()
  todayExits: number;

  @ApiProperty()
  avgDuration: number;

  @ApiProperty()
  occupancyRate: number;
}