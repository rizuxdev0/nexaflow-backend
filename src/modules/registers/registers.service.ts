import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Register } from './entities/register.entity';
import { CreateRegisterDto } from './dto/create-register.dto';
import { UpdateRegisterDto } from './dto/update-register.dto';
import { CashSessionsService } from '../cash-sessions/cash-sessions.service';

@Injectable()
export class RegistersService {
  constructor(
    @InjectRepository(Register)
    private registersRepository: Repository<Register>,
    private cashSessionsService: CashSessionsService,
  ) {}

  async create(createRegisterDto: CreateRegisterDto): Promise<Register> {
    // Vérifier si le code existe déjà
    const existingCode = await this.registersRepository.findOne({
      where: { code: createRegisterDto.code },
    });

    if (existingCode) {
      throw new ConflictException(
        `Une caisse avec le code "${createRegisterDto.code}" existe déjà`,
      );
    }

    // Si c'est une caisse principale, retirer le flag des autres
    if (createRegisterDto.isMain) {
      await this.registersRepository.update(
        { isMain: true },
        { isMain: false },
      );
    }

    const register = this.registersRepository.create(createRegisterDto);
    return await this.registersRepository.save(register);
  }

  async findAll(isActive?: boolean): Promise<Register[]> {
    const where: FindOptionsWhere<Register> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const registers = await this.registersRepository.find({
      where,
      order: { isMain: 'DESC', name: 'ASC' },
    });

    // Ajouter les sessions actives
    const registersWithSessions = await Promise.all(
      registers.map(async (register) => {
        const activeSession =
          await this.cashSessionsService.findActiveByRegister(register.id);
        return {
          ...register,
          activeSession: activeSession || null,
        };
      }),
    );

    return registersWithSessions;
  }

  async findOne(id: string): Promise<Register> {
    const register = await this.registersRepository.findOne({
      where: { id },
      relations: ['sessions'],
    });

    if (!register) {
      throw new NotFoundException(`Caisse avec l'ID "${id}" non trouvée`);
    }

    const activeSession =
      await this.cashSessionsService.findActiveByRegister(id);
    return {
      ...register,
      activeSession: activeSession || null,
    } as any;
  }

  async findByCode(code: string): Promise<Register> {
    const register = await this.registersRepository.findOne({
      where: { code },
    });

    if (!register) {
      throw new NotFoundException(`Caisse avec le code "${code}" non trouvée`);
    }

    return register;
  }

  async getMainRegister(): Promise<Register> {
    const mainRegister = await this.registersRepository.findOne({
      where: { isMain: true, isActive: true },
    });

    if (!mainRegister) {
      throw new NotFoundException('Aucune caisse principale trouvée');
    }

    return mainRegister;
  }

  async update(
    id: string,
    updateRegisterDto: UpdateRegisterDto,
  ): Promise<Register> {
    const register = await this.findOne(id);

    // Vérifier l'unicité du code si modifié
    if (updateRegisterDto.code && updateRegisterDto.code !== register.code) {
      const existingCode = await this.registersRepository.findOne({
        where: { code: updateRegisterDto.code },
      });

      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Une caisse avec le code "${updateRegisterDto.code}" existe déjà`,
        );
      }
    }

    // Si on veut définir comme caisse principale
    if (updateRegisterDto.isMain && !register.isMain) {
      await this.registersRepository.update(
        { isMain: true },
        { isMain: false },
      );
    }

    Object.assign(register, updateRegisterDto);
    return await this.registersRepository.save(register);
  }

  async remove(id: string): Promise<void> {
    const register = await this.findOne(id);

    // Empêcher la suppression de la caisse principale
    if (register.isMain) {
      throw new BadRequestException(
        'Impossible de supprimer la caisse principale',
      );
    }

    // Vérifier si des sessions existent
    if (register.sessions && register.sessions.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la caisse car elle a ${register.sessions.length} session(s) associée(s)`,
      );
    }

    await this.registersRepository.remove(register);
  }

  async toggleStatus(id: string): Promise<Register> {
    const register = await this.findOne(id);

    // Empêcher la désactivation de la caisse principale
    if (register.isMain && register.isActive) {
      throw new BadRequestException(
        'Impossible de désactiver la caisse principale',
      );
    }

    register.isActive = !register.isActive;
    return await this.registersRepository.save(register);
  }

  async assignUser(id: string, userId: string): Promise<Register> {
    const register = await this.findOne(id);
    register.assignedUserId = userId;
    return await this.registersRepository.save(register);
  }
}
