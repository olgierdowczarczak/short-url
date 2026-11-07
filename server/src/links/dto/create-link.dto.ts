import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsUrl,
  Matches,
  MaxLength,
  MinDate,
  MinLength,
} from 'class-validator';
import { IsNotReservedAlias } from '../validators/is-not-reserved-alias.validator.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLinkDto {
  @ApiProperty({ example: 'https://example.com' })
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @MinLength(6)
  @MaxLength(2048)
  url: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Type(() => Date)
  @IsDate()
  @MinDate(() => new Date())
  @IsOptional()
  expiresAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'my-alias' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/)
  @IsNotReservedAlias()
  alias?: string | null;
}
