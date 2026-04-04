import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { VendorRequestsService } from './vendor-requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VendorRequestStatus } from './entities/vendor-request.entity';

@Controller('vendor-requests')
@UseGuards(JwtAuthGuard)
export class VendorRequestsController {
  constructor(private readonly vendorRequestsService: VendorRequestsService) {}

  @Post()
  async create(@Req() req, @Body() data: any) {
    return this.vendorRequestsService.create(req.user.id, data);
  }

  @Get('my')
  async getMyRequests(@Req() req) {
    return this.vendorRequestsService.getMyRequests(req.user.id);
  }

  @Get()
  @Roles('super_admin', 'admin')
  @UseGuards(RolesGuard)
  async findAll() {
    return this.vendorRequestsService.findAll();
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @UseGuards(RolesGuard)
  async findOne(@Param('id') id: string) {
    return this.vendorRequestsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('super_admin', 'admin')
  @UseGuards(RolesGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: VendorRequestStatus,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.vendorRequestsService.updateStatus(id, status, adminNotes);
  }
}
