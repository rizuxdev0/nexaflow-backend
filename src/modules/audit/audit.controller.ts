import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditFilterDto } from './dto/audit-filter.dto';
import { AuditResponseDto } from './dto/audit-response.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('audit')
@Controller('audit')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('reports.read')
  @ApiOperation({ summary: "Liste paginée des logs d'audit" })
  @ApiResponse({ status: 200, description: 'Liste des logs' })
  async findAll(
    @Query() filterDto: AuditFilterDto,
  ): Promise<PaginatedResponse<AuditResponseDto>> {
    return this.auditService.findAll(filterDto);
  }

  @Get('stats')
  @Permissions('reports.read')
  @ApiOperation({ summary: "Statistiques des logs d'audit" })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStats() {
    return this.auditService.getStats();
  }
}
