import { Test, TestingModule } from '@nestjs/testing';
import { StoreConfigService } from './store-config.service';

describe('StoreConfigService', () => {
  let service: StoreConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreConfigService],
    }).compile();

    service = module.get<StoreConfigService>(StoreConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
