import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LinkResponseDto {
  @ApiProperty({ example: 'yVLzIzm_', minLength: 3, maxLength: 32 })
  @Expose()
  code: string;

  @ApiProperty({ example: 'https://example.com' })
  @Expose()
  url: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  clicks: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Expose()
  expiresAt: Date | null;
}
