import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './entities/dtos/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['profile'],
    });
    return users;
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.findOne(id);
    return user;
  }

  async getProfileByUserId(id: number) {
    const user = await this.findOne(id);
    return user.profile;
  }

  async getPostsByUserId(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['posts'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user.posts;
  }

  async create(user: CreateUserDto): Promise<User> {
    try {
      const newUser = this.usersRepository.create(user);
      const savedUser = await this.usersRepository.save(newUser);
      return this.findOne(savedUser.id);
    } catch {
      throw new BadRequestException('Error creating user');
    }
  }

  async delete(id: number) {
    try {
      await this.usersRepository.delete(id);
      return { message: 'User deleted successfully' };
    } catch {
      throw new BadRequestException('Error deleting user');
    }
  }

  async update(id: number, userData: UpdateUserDto): Promise<UpdateUserDto> {
    try {
      const user = await this.findOne(id);
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      const updatedUser = this.usersRepository.merge(user, userData);
      const savedUser = await this.usersRepository.save(updatedUser);
      return savedUser;
    } catch {
      throw new BadRequestException('Error updating user');
    }
  }

  private async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}
