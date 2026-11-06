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

  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{3,32}$/)
  @IsNotReservedAlias()
  alias?: string | null;
}
