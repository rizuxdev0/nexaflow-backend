import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreConfig } from './entities/store-config.entity';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';

@Injectable()
export class StoreConfigService {
  constructor(
    @InjectRepository(StoreConfig)
    private readonly configRepository: Repository<StoreConfig>,
  ) {}

  async get(): Promise<StoreConfig> {
    let config = await this.configRepository.findOne({ where: { id: 'default' } });
    
    if (!config) {
      config = this.configRepository.create({
        id: 'default',
        identity: {},
        checkout: {},
        content: {},
        seo: {},
        social: {},
        features: []

      });
      await this.configRepository.save(config);
    }
    
    return config;
  }

  async update(updateStoreConfigDto: UpdateStoreConfigDto): Promise<StoreConfig> {
    const config = await this.get();
    Object.assign(config, updateStoreConfigDto);
    return this.configRepository.save(config);
  }
}
