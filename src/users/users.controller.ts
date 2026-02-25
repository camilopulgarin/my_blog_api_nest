import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './entities/dtos/user.dto';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}
  @Get()
  async getAllUsers(): Promise<User[]> {
    console.log('Fetching all users');
    return await this.usersService.findAll();
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    console.log(`Fetching user with id: ${id}`);
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  @Get(':id/profile')
  async getProfileByUserId(@Param('id', ParseIntPipe) id: number) {
    console.log(`Fetching profile for user with id: ${id}`);
    return await this.usersService.getProfileByUserId(id);
  }

  @Get(':id/posts')
  async getPostsByUserId(@Param('id', ParseIntPipe) id: number) {
    console.log(`Fetching posts for user with id: ${id}`);
    return await this.usersService.getPostsByUserId(id);
  }

  @Post()
  async createUser(@Body() userData: CreateUserDto): Promise<User> {
    return await this.usersService.create(userData);
  }

  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    this.usersService.delete(id);
    return { message: `User with id ${id} deleted` };
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() userData: UpdateUserDto,
  ) {
    return await this.usersService.update(id, userData);
  }
}
