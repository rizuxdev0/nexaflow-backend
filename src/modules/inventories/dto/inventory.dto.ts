import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsArray, IsDateString, IsNumber } from 'class-validator';
import { InventoryCountStatus, InventoryCountItem } from '../entities/inventory.entity';

export class CreateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledDate: Date;

  @IsArray()
  @IsOptional()
  items?: InventoryCountItem[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryStatusDto {
  @IsEnum(InventoryCountStatus)
  status: InventoryCountStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryItemsDto {
  @IsArray()
  @IsNotEmpty()
  items: InventoryCountItem[];
}
