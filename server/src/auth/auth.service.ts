import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const passwordHash = await argon2.hash(dto.password);
    return this.usersService.create(dto.email, passwordHash);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await argon2.verify(this.dummyHash, dto.password);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordCorrect = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
    return { accessToken };
  }

  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomBytes(32).toString('hex'));
  }
}
