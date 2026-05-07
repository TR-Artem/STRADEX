import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    email: string;
    password: string;
    name?: string;
    organizationName: string;
  }) {
    const existing = await this.prisma.organizationUser.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Create organization first
    const organization = await this.prisma.organization.create({
      data: {
        name: data.organizationName,
        slug: data.organizationName.toLowerCase().replace(/\s+/g, '-'),
      },
    });

    // Create user
    const passwordHash = this.hashPassword(data.password);
    const user = await this.prisma.organizationUser.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: 'OWNER',
        organizationId: organization.id,
      },
    });

    const token = this.generateToken(user.id, user.organizationId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.organizationUser.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = this.hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.organizationUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(user.id, user.organizationId, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
      token,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.organizationUser.findUnique({
        where: { id: payload.sub },
        include: { organization: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private generateToken(userId: string, organizationId: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      organizationId,
      role,
    });
  }
}
