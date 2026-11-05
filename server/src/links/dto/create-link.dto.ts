import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsUrl,
  MaxLength,
  MinDate,
  MinLength,
} from 'class-validator';

export class CreateLinkDto {
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @MinLength(6)
  @MaxLength(2048)
  url: string;

  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  @IsOptional()
  expiresAt?: Date | null;
}
