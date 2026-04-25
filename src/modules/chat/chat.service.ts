import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async createConversation(data: { 
    customerName?: string; 
    customerEmail?: string; 
    customerId?: string;
    type?: 'support' | 'order' | 'internal' | 'group';
    orderId?: string;
    driverId?: string;
    title?: string;
    metadata?: any;
  }) {
    console.log('Attempting to create/find conversation type:', data.type || 'support');
    
    // For 1-1 support chats, look for existing active one
    if ((data.type === 'support' || !data.type) && (data.customerId || data.customerEmail)) {
      const existing = await this.conversationRepo.findOne({
        where: [
          ...(data.customerId ? [{ customerId: data.customerId, status: 'active' as any, type: 'support' as any }] : []),
          ...(data.customerEmail ? [{ customerEmail: data.customerEmail, status: 'active' as any, type: 'support' as any }] : [])
        ],
        order: { updatedAt: 'DESC' }
      });
      if (existing) return existing;
    }

    // For order-specific chats (Driver-Customer)
    if (data.type === 'order' && data.orderId) {
      const existing = await this.conversationRepo.findOne({
        where: { orderId: data.orderId, type: 'order', status: 'active' }
      });
      if (existing) return existing;
    }

    console.log('Creating new conversation');
    const conversation = this.conversationRepo.create({
      ...data,
      type: data.type || 'support',
      status: 'active',
    });
    return this.conversationRepo.save(conversation);
  }

  async getConversation(id: string) {
    const conv = await this.conversationRepo.findOne({
      where: { id },
      relations: ['messages'],
    });
    if (!conv) throw new NotFoundException('Conversation introuvable');
    return conv;
  }

  async getActiveConversations(filters?: { type?: string; driverId?: string; customerId?: string }) {
    return this.conversationRepo.find({
      where: { 
        status: 'active',
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.driverId && { driverId: filters.driverId }),
        ...(filters?.customerId && { customerId: filters.customerId }),
      },
      order: { updatedAt: 'DESC' },
    });
  }

  async saveMessage(data: { 
    conversationId: string; 
    content: string; 
    senderType: 'customer' | 'admin' | 'driver'; 
    senderId?: string;
    attachments?: any[];
  }) {
    console.log('Chat Service saving message for conversation:', data.conversationId);
    const message = this.messageRepo.create(data);
    const saved = await this.messageRepo.save(message);
    
    // Update last message in conversation
    await this.conversationRepo.update(data.conversationId, {
      lastMessage: data.content || (data.attachments?.length ? 'Pièce jointe' : ''),
      updatedAt: new Date(),
    });

    console.log('Message saved successfully with ID:', saved.id);
    return saved;
  }

  async closeConversation(id: string) {
    return this.conversationRepo.update(id, { status: 'closed' });
  }

  async getMessages(conversationId: string) {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteMessage(id: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message introuvable');
    await this.messageRepo.remove(message);
    return message;
  }
}
