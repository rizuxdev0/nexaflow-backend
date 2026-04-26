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
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    console.log(`[ChatGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[ChatGateway] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(data.conversationId);
    const size = this.server.sockets.adapter.rooms.get(data.conversationId)?.size ?? 0;
    console.log(`[ChatGateway] ${client.id} joined room ${data.conversationId} | size: ${size}`);
    return { status: 'success', joined: data.conversationId, roomSize: size };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      conversationId: string;
      content: string;
      senderType: 'customer' | 'admin' | 'driver';
      attachments?: any[];
    },
  ) {
    const user = (client as any).user;
    let senderId = user?.sub || user?.id || (data as any).senderId;

    // Fallback: resolve senderId from conversation for any senderType
    if (!senderId) {
      const conv = await this.chatService.getConversation(data.conversationId);
      if (data.senderType === 'customer') {
        senderId = conv?.customerId;
      } else if (data.senderType === 'admin') {
        // Use the socket id as a fallback identifier for admin
        senderId = client.id;
      }
    }

    if (!senderId) {
      console.error('[ChatGateway] sendMessage rejected: no senderId');
      return { status: 'error', message: 'Unauthorized' };
    }

    const message = await this.chatService.saveMessage({ ...data, senderId });
    const conversation = await this.chatService.getConversation(data.conversationId);

    let senderName = user?.name || user?.firstName || conversation?.customerName || 'Client';
    if (data.senderType === 'driver') senderName = user?.name || 'Livreur';
    if (data.senderType === 'admin') senderName = user?.name || user?.firstName || 'Administration';

    const enrichedMessage = { ...message, senderName };

    // Ensure sender is in room
    client.join(data.conversationId);

    const roomSize = this.server.sockets.adapter.rooms.get(data.conversationId)?.size ?? 0;
    console.log(`[ChatGateway] Sending to room ${data.conversationId} | size: ${roomSize}`);

    // 1️⃣ Send to everyone already in the room (including the sender now)
    this.server.to(data.conversationId).emit('newMessage', enrichedMessage);

    if (data.senderType === 'admin') {
      // 2️⃣ ADMIN→CLIENT: broadcast to ALL sockets so client receives even if not in room
      // Client filters by conversationId
      console.log(`[ChatGateway] Broadcasting adminReply to all sockets`);
      this.server.emit('adminReply', {
        conversationId: data.conversationId,
        message: enrichedMessage,
      });
    } else {
      // 3️⃣ CLIENT→ADMIN: notify admin panel
      console.log(`[ChatGateway] Broadcasting adminNotification to all sockets`);
      this.server.emit('adminNotification', {
        type: 'new_message',
        conversationId: data.conversationId,
        message: enrichedMessage,
      });
    }

    return enrichedMessage;
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    // Notify everyone in the room that a message was deleted
    this.server.to(data.conversationId).emit('messageDeleted', { messageId: data.messageId });
    return { status: 'success' };
  }

  // --- GLOBAL ALERTS ---
  emitNewOrder(order: any) {
    this.server.emit('newOrder', order);
  }

  emitLowStock(product: any) {
    this.server.emit('lowStock', product);
  }
}
