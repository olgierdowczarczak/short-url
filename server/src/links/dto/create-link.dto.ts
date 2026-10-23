import { IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @MinLength(6)
  @MaxLength(2048)
  url: string;
}
