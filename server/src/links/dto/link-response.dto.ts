import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LinkResponseDto {
  @Expose()
  code: string;

  @Expose()
  url: string;

  @Expose()
  createdAt: Date;
}
