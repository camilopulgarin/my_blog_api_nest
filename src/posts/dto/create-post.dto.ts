import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'The title of the post' })
  title: string = '';

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The content of the post' })
  content: string = '';

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The cover image URL of the post' })
  coverImage: string = '';

  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'The summary of the post' })
  summary: string = '';

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ description: 'Indicates if the post is a draft' })
  isDraft?: boolean = false;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @ApiProperty({
    description: 'The IDs of the categories associated with the post',
  })
  categoryIds?: number[];
}
