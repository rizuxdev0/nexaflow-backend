import { Controller, Get, Put, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnPolicyService } from './return-policy.service';

@ApiTags('return-policy')
@Controller('return-policy')
@ApiBearerAuth()
export class ReturnPolicyController {
  constructor(private readonly service: ReturnPolicyService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la politique de retour' })
  getPolicy() {
    return this.service.getPolicy();
  }

  @Put()
  @ApiOperation({ summary: 'Mettre à jour la politique de retour' })
  updatePolicy(@Body() data: Record<string, any>) {
    return this.service.updatePolicy(data);
  }

  @Put('category-rules')
  @ApiOperation({ summary: 'Ajouter ou mettre à jour une règle par catégorie' })
  updateCategoryRule(@Body() rule: Record<string, any>) {
    return this.service.updateCategoryRule(rule);
  }

  @Delete('category-rules/:categoryId')
  @ApiOperation({ summary: 'Supprimer une règle par catégorie' })
  removeCategoryRule(@Param('categoryId') categoryId: string) {
    return this.service.removeCategoryRule(categoryId);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Réinitialiser aux valeurs par défaut' })
  resetToDefault() {
    return this.service.resetToDefault();
  }
}
