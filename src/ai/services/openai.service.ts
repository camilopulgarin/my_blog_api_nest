import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Env } from '../../env.model';

@Injectable()
export class OpenaiService {
  private openai: OpenAI;

  constructor(configService: ConfigService<Env>) {
    const apiKey = configService.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateSummary(content: string): Promise<string> {
    const response = await this.openai.responses.create({
      model: 'gpt-3.5-turbo',
      instructions:
        'You are a helpful assistant that generates summaries for blog post.You should generate a summary with 255 characters or less.',
      input: content,
    });
    return response.output_text;
  }

  async generateImage(text: string) {
    const prompt = `Generate an image for a blog post about: ${text}`;
    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      response_format: 'url',
    });
    if (!response.data?.[0]?.url) {
      throw new Error('Failed to generate image');
    }
    return response.data[0].url;
  }
}
