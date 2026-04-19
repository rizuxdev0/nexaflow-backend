import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean, IsNumber, ValidateIf } from 'class-validator';
import { DriverStatus } from '../entities/driver.entity';

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateIf(o => o.email && o.email !== '')
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class UpdateDriverDto extends CreateDriverDto {}

export class AssignDeliveryDto {
  @IsString()
  orderId: string;

  @IsString()
  driverId: string;
}

export class UpdateDeliveryStatusDto {
  @IsEnum(['pending', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'])
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDriverLocationDto {
  @IsString()
  driverId: string;

  @IsString()
  latitude: string;

  @IsString()
  longitude: string;
}
