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
    console.log('Attempting to create/find conversation for:', data.customerName, 'ID:', data.customerId);
    
    // Look for an existing active conversation using either ID or Email
    if (data.customerId || data.customerEmail) {
      const queryBuilder = this.conversationRepo.createQueryBuilder('conversation')
        .where('conversation.status = :status', { status: 'active' })
        .andWhere('(conversation.customerId = :customerId OR conversation.customerEmail = :customerEmail)', {
          customerId: data.customerId || null,
          customerEmail: data.customerEmail || null
        })
        .orderBy('conversation.updatedAt', 'DESC');

      const existing = await queryBuilder.getOne();
      if (existing) {
        console.log('Reusing existing conversation:', existing.id);
        
        // Update missing link if needed (e.g., guest transitioned to logged in)
        if (data.customerId && !existing.customerId) {
          await this.conversationRepo.update(existing.id, { customerId: data.customerId });
        }
        return existing;
      }
    }

    console.log('Creating new conversation for:', data.customerName);
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
    const allActive = await this.conversationRepo.find({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });

    // Remove duplicates: keep only the most recently updated conversation per customer
    const uniqueConversations: Conversation[] = [];
    const seenCustomers = new Set<string>();

    for (const conv of allActive) {
      const identifier = conv.customerId || conv.customerEmail || conv.customerName;
      if (!seenCustomers.has(identifier)) {
        seenCustomers.add(identifier);
        uniqueConversations.push(conv);
      }
    }

    return uniqueConversations;
  }

  async saveMessage(data: { conversationId: string; content: string; senderType: 'customer' | 'admin'; senderId?: string }) {
    console.log('Chat Service saving message for conversation:', data.conversationId);
    const message = this.messageRepo.create(data);
    const saved = await this.messageRepo.save(message);
    
    // Update last message in conversation
    await this.conversationRepo.update(data.conversationId, {
      lastMessage: data.content,
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
}
