import { Test, TestingModule } from '@nestjs/testing';
import { StoreConfigController } from './store-config.controller';

describe('StoreConfigController', () => {
  let controller: StoreConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreConfigController],
    }).compile();

    controller = module.get<StoreConfigController>(StoreConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
