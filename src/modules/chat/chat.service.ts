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

  async createConversation(data: { customerName: string; customerEmail?: string; customerId?: string }) {
    // Look for an existing active conversation for this customer
    if (data.customerId) {
      const existing = await this.conversationRepo.findOne({
        where: { customerId: data.customerId, status: 'active' },
        order: { updatedAt: 'DESC' },
      });
      if (existing) return existing;
    } else if (data.customerEmail) {
      const existing = await this.conversationRepo.findOne({
        where: { customerEmail: data.customerEmail, status: 'active' },
        order: { updatedAt: 'DESC' },
      });
      if (existing) return existing;
    }

    const conversation = this.conversationRepo.create({
      ...data,
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

  async getActiveConversations() {
    return this.conversationRepo.find({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });
  }

  async saveMessage(data: { conversationId: string; content: string; senderType: 'customer' | 'admin'; senderId?: string }) {
    const message = this.messageRepo.create(data);
    const saved = await this.messageRepo.save(message);
    
    // Update last message in conversation
    await this.conversationRepo.update(data.conversationId, {
      lastMessage: data.content,
      updatedAt: new Date(),
    });

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
}
