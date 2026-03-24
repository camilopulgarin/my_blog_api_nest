import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { Post } from '../entities/post.entity';
import { OpenaiService } from '../../ai/services/openai.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private openaiService: OpenaiService,
  ) {}

  async create(createPostDto: CreatePostDto, userId: number) {
    try {
      const newPost = this.postsRepository.create({
        ...createPostDto,
        user: { id: userId },
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

  async publish(id: number, userId: number) {
    try {
      const post = await this.findOne(id);
      if (post.user.id !== userId) {
        throw new ForbiddenException(
          'You are not allowed to publish this post',
        );
      }
      if (!post.content || !post.title || post.categories.length === 0) {
        throw new BadRequestException(
          'Post must have content, title, and at least one category before publishing',
        );
      }
      const summary = await this.openaiService.generateSummary(post.content);
      const image = await this.openaiService.generateImage(summary);
      const publishedPost = this.postsRepository.merge(post, {
        isDraft: false,
        summary,
        coverImage: image,
      });
      const updatedPost = await this.postsRepository.save(publishedPost);
      return updatedPost;
    } catch (error: any) {
      console.log('Error publishing post:', error);
      throw new BadRequestException('Error publishing post');
    }
  }
}
