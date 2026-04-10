import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { StoreConfigService } from '../store-config/store-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PlanGuard, CheckPlan } from '../../common/guards/plan.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlanGuard)
@CheckPlan('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly storeConfigService: StoreConfigService,
  ) {}

  private async checkFeatureEnabled() {
    const config = await this.storeConfigService.get();
    const chatFeature = config.features.find(f => f.id === 'chat');
    if (!chatFeature || !chatFeature.enabled) {
      throw new ForbiddenException('La fonctionnalité de chat est désactivée.');
    }
  }

  @Public()
  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Body() data: { customerName: string; customerEmail?: string; customerId?: string },
  ) {
    console.log('ChatController: Incoming createConversation request', data);
    await this.checkFeatureEnabled();
    return this.chatService.createConversation(data);
  }

  @Get('active')
  @UseGuards(PermissionsGuard)
  @Permissions('READ_CHAT')
  @ApiOperation({ summary: 'Get all active conversations' })
  async getActiveConversations() {
    return this.chatService.getActiveConversations();
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one conversation with messages' })
  async getConversation(@Param('id') id: string) {
    return this.chatService.getConversation(id);
  }

  @Patch('conversations/:id/close')
  @UseGuards(PermissionsGuard)
  @Permissions('CLOSE_CHAT')
  @ApiOperation({ summary: 'Close a conversation' })
  async closeConversation(@Param('id') id: string) {
    return this.chatService.closeConversation(id);
  }

  @Get('conversations/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getMessages(@Param('id') id: string) {
    console.log('ChatController: Fetching messages for:', id);
    return this.chatService.getMessages(id);
  }
}
