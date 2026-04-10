import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtAuthGuard } from '../../common/guards/ws-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log('Client attempting to connect');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; senderType: 'customer' | 'admin' },
  ) {
    // We assume the user is injected by the guard
    const user = (client as any).user;
    console.log('Chat message received from user:', user?.email, 'Type:', data.senderType);
    console.log('Message Content payload:', JSON.stringify(data, null, 2));
    
    if (!user) {
      console.error('Unauthorized chat attempt - no user in socket');
      return { status: 'error', message: 'Unauthorized' };
    }

    const message = await this.chatService.saveMessage({
      ...data,
      senderId: user.sub || user.id,
    });
    
    const conversation = await this.chatService.getConversation(data.conversationId);
    const enrichedMessage = { ...message, senderName: conversation.customerName };

    console.log('Broadcasting enriched message to room:', data.conversationId);
    this.server.to(data.conversationId).emit('newMessage', enrichedMessage);
    
    if (enrichedMessage.senderType === 'customer') {
      console.log('Sending admin notification for new customer message');
      this.server.emit('adminNotification', {
        type: 'new_message',
        conversationId: enrichedMessage.conversationId,
        message: enrichedMessage,
      });
    }

    return enrichedMessage;
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(data.conversationId);
    return { status: 'success', joined: data.conversationId };
  }
}
