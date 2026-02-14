import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegistersService } from './registers.service';
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';
import { Register } from './entities/register.entity';

@ApiTags('registers')
@Controller('registers')
@ApiBearerAuth()
export class RegistersController {
  constructor(private readonly registersService: RegistersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle caisse' })
  @ApiResponse({ status: 201, description: 'Caisse créée avec succès' })
  @ApiResponse({ status: 409, description: 'Code déjà existant' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRegisterDto: CreateRegisterDto): Promise<Register> {
    return this.registersService.create(createRegisterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des caisses' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Liste des caisses' })
  findAll(@Query('isActive') isActive?: boolean): Promise<Register[]> {
    return this.registersService.findAll(isActive);
  }

  @Get('main')
  @ApiOperation({ summary: 'Obtenir la caisse principale' })
  @ApiResponse({ status: 200, description: 'Caisse principale' })
  @ApiResponse({ status: 404, description: 'Aucune caisse principale trouvée' })
  getMainRegister(): Promise<Register> {
    return this.registersService.getMainRegister();
  }

  @Get('code/:code')
  @ApiOperation({ summary: "Détail d'une caisse par son code" })
  @ApiParam({ name: 'code', description: 'Code de la caisse' })
  @ApiResponse({ status: 200, description: 'Caisse trouvée' })
  @ApiResponse({ status: 404, description: 'Caisse non trouvée' })
  findByCode(@Param('code') code: string): Promise<Register> {
    return this.registersService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une caisse" })
  @ApiParam({ name: 'id', description: 'ID de la caisse' })
  @ApiResponse({ status: 200, description: 'Caisse trouvée' })
  @ApiResponse({ status: 404, description: 'Caisse non trouvée' })
  findOne(@Param('id') id: string): Promise<Register> {
    return this.registersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une caisse' })
  @ApiParam({ name: 'id', description: 'ID de la caisse' })
  @ApiResponse({ status: 200, description: 'Caisse modifiée' })
  @ApiResponse({ status: 404, description: 'Caisse non trouvée' })
  @ApiResponse({ status: 409, description: 'Code déjà existant' })
  update(
    @Param('id') id: string,
    @Body() updateRegisterDto: UpdateRegisterDto,
  ): Promise<Register> {
    return this.registersService.update(id, updateRegisterDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une caisse' })
  @ApiParam({ name: 'id', description: 'ID de la caisse' })
  @ApiResponse({ status: 204, description: 'Caisse supprimée' })
  @ApiResponse({ status: 404, description: 'Caisse non trouvée' })
  @ApiResponse({ status: 400, description: 'Caisse non supprimable' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.registersService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver une caisse' })
  @ApiParam({ name: 'id', description: 'ID de la caisse' })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Caisse non trouvée' })
  @ApiResponse({
    status: 400,
    description: 'Impossible de désactiver la caisse principale',
  })
  toggleStatus(@Param('id') id: string): Promise<Register> {
    return this.registersService.toggleStatus(id);
  }

  @Patch(':id/assign/:userId')
  @ApiOperation({ summary: 'Assigner un utilisateur à une caisse' })
  @ApiParam({ name: 'id', description: 'ID de la caisse' })
  @ApiParam({ name: 'userId', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur assigné' })
  @ApiResponse({ status: 404, description: 'Caisse non trouvée' })
  assignUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<Register> {
    return this.registersService.assignUser(id, userId);
  }
}
