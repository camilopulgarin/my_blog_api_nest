import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post } from '../entities/post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async create(createPostDto: CreatePostDto) {
    try {
      const newPost = this.postsRepository.create({
        ...createPostDto,
        user: { id: createPostDto.userId },
        categories: createPostDto.categoryIds
          ? createPostDto.categoryIds.map((id) => ({ id }))
          : [],
      });
      await this.postsRepository.save(newPost);
      return this.findOne(newPost.id);
    } catch {
      throw new BadRequestException('Error creating post');
    }
  }

  async findAll(): Promise<Post[]> {
    return await this.postsRepository.find({
      relations: ['user.profile', 'categories'],
    });
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user.profile', 'categories'],
    });
    if (!post) {
      throw new NotFoundException(`Post with id ${id} not found`);
    }
    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<Post> {
    try {
      const post = await this.findOne(id);
      const updatedPost = this.postsRepository.merge(post, updatePostDto);
      return await this.postsRepository.save(updatedPost);
    } catch {
      throw new BadRequestException('Error updating post');
    }
  }

  async remove(id: number) {
    try {
      await this.postsRepository.delete(id);
      return { message: 'Post deleted successfully' };
    } catch {
      throw new BadRequestException('Error deleting post');
    }
  }

  async getPostsByCategory(categoryId: number) {
    const post = await this.postsRepository.find({
      where: { categories: { id: categoryId } },
      relations: ['user.profile'],
    });
    return post;
  }
}
