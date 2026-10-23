import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('links')
export class Link {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text' })
  url: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
