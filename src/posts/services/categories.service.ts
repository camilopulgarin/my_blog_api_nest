import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(data: CreateCategoryDto): Promise<Category> {
    try {
      const category = this.categoriesRepository.create(data);
      return await this.categoriesRepository.save(category);
    } catch {
      throw new BadRequestException('Error creating category');
    }
  }

  async findAll(): Promise<Category[]> {
    return await this.categoriesRepository.find();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async update(id: number, data: UpdateCategoryDto): Promise<Category> {
    try {
      const category = await this.findOne(id);
      const updated = this.categoriesRepository.merge(category, data);
      return await this.categoriesRepository.save(updated);
    } catch {
      throw new BadRequestException('Error updating category');
    }
  }

  async remove(id: number) {
    try {
      await this.categoriesRepository.delete(id);
      return { message: 'Category deleted successfully' };
    } catch {
      throw new BadRequestException('Error deleting category');
    }
  }
}
