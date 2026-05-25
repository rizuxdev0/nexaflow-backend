import { Controller, Get, Post, Body } from '@nestjs/common';
import { SetupService } from './setup.service';
import { InitializeSystemDto } from './dto/initialize-system.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Vérifier si le système est initialisé' })
  getStatus() {
    return this.setupService.getStatus();
  }

  @Public()
  @Post('initialize')
  @ApiOperation({ summary: 'Initialiser le système (Premier démarrage)' })
  initialize(@Body() dto: InitializeSystemDto) {
    return this.setupService.initialize(dto);
  }
}
