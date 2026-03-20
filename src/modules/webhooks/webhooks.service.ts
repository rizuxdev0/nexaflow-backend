import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from './entities/webhook.entity';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
  ) {}

  async findAll() {
    return this.webhookRepo.find();
  }

  async findOne(id: string) {
    const hook = await this.webhookRepo.findOne({ where: { id } });
    if (!hook) throw new NotFoundException('Webhook non trouvé');
    return hook;
  }

  async create(dto: CreateWebhookDto) {
    const hook = this.webhookRepo.create({
      ...dto,
      secret: crypto.randomBytes(32).toString('hex')
    });
    return this.webhookRepo.save(hook);
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const hook = await this.findOne(id);
    Object.assign(hook, dto);
    return this.webhookRepo.save(hook);
  }

  async remove(id: string) {
    const hook = await this.findOne(id);
    return this.webhookRepo.remove(hook);
  }

  async trigger(event: string, payload: any) {
    const hooks = await this.webhookRepo.find({ where: { isActive: true } });
    
    const activeHooks = hooks.filter(h => h.events.includes(event) || h.events.includes('*'));

    const promises = activeHooks.map(async (hook) => {
      try {
        const body = JSON.stringify({ event, payload, timestamp: new Date() });
        const signature = this.generateSignature(body, hook.secret);

        await axios.post(hook.url, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-NexaFlow-Event': event,
            'X-NexaFlow-Signature': signature
          },
          timeout: 5000
        });
      } catch (error) {
        console.error(`Webhook error (${hook.url}): ${error.message}`);
      }
    });

    return Promise.allSettled(promises);
  }

  private generateSignature(body: string, secret: string) {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }
}
