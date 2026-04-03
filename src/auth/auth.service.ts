import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Role } from '../common/enums';

import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create({
      ...registerDto,
      role: registerDto.role || Role.STUDENT,
    });

    const token = this.generateToken(user);
    return { user, token, message: 'Registration successful' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated. Contact admin.');

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const { password, ...userData } = user.toObject();
    const token = this.generateToken(user);

    return {
      user: userData,
      token,
      message: 'Login successful',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If an account exists with this email, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.updateResetToken(user._id.toString(), token, expires);
    await this.mailService.sendPasswordResetEmail(user, token);

    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  async resetPassword(resetDto: any) {
    const user = await this.usersService.findByResetToken(resetDto.token);
    if (!user) throw new UnauthorizedException('Invalid or expired reset token');

    const hashedPassword = await bcrypt.hash(resetDto.password, 12);
    await this.usersService.updatePassword(user._id.toString(), hashedPassword);

    return { message: 'Password has been reset successfully' };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
