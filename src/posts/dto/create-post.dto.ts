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
  title: string = '';

  @IsString()
  @IsOptional()
  content: string = '';

  @IsString()
  @IsOptional()
  coverImage: string = '';

  @IsString()
  @IsOptional()
  summary: string = '';

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean = false;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  categoryIds?: number[];
}
