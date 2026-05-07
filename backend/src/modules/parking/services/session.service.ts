import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { TariffService } from './tariff.service';
import { WhitelistService } from './whitelist.service';
import { BlacklistService } from './blacklist.service';
import { ParkingGateway } from '../gateways/parking.gateway';
import { EntryEventDto, ExitEventDto, CreateSessionDto } from '../dto/session.dto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffService: TariffService,
    private readonly whitelistService: WhitelistService,
    private readonly blacklistService: BlacklistService,
    private readonly eventEmitter: EventEmitter2,
    private readonly parkingGateway: ParkingGateway,
  ) {}

  /**
   * Handle vehicle entry from ALPR camera
   */
  async processEntry(dto: EntryEventDto, organizationId: string): Promise<{
    sessionId: string;
    plate: string;
    entryTime: Date;
    isWhitelisted: boolean;
    isBlacklisted: boolean;
    barrierOpened: boolean;
  }> {
    const plate = this.normalizePlate(dto.plate);

    // Check for duplicate entry
    const existingActive = await this.prisma.parkingSession.findFirst({
      where: {
        plateNumber: plate,
        status: 'ACTIVE',
        location: { organizationId },
      },
      include: { location: true },
    });

    if (existingActive) {
      this.logger.warn(`Duplicate entry detected for plate ${plate}`);
      return {
        sessionId: existingActive.id,
        plate: existingActive.plateNumber,
        entryTime: existingActive.entryTime,
        isWhitelisted: false,
        isBlacklisted: false,
        barrierOpened: false,
      };
    }

    // Check whitelist
    const isWhitelisted = await this.whitelistService.isWhitelisted(plate, organizationId);

    // Check blacklist
    const blacklistResult = await this.blacklistService.checkBlacklist(plate, organizationId);
    const isBlacklisted = blacklistResult.isBlacklisted;
    const alertLevel = blacklistResult.alertLevel;

    // Find camera and location
    const camera = await this.prisma.parkingCamera.findFirst({
      where: { id: dto.cameraId, organizationId },
      include: { location: true },
    });

    if (!camera) {
      throw new NotFoundException(`Camera ${dto.cameraId} not found`);
    }

    // Create session
    const session = await this.prisma.parkingSession.create({
      data: {
        locationId: camera.locationId,
        organizationId,
        plateNumber: plate,
        plateRaw: dto.plateRaw || dto.plate,
        plateConfidence: dto.confidence,
        entryCameraId: dto.cameraId,
        entryDeviceId: dto.deviceId,
        entryTime: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        entryPhoto: dto.photoUrl,
        status: 'ACTIVE',
      },
    });

    // Emit events
    this.parkingGateway.emitToLocation(camera.locationId, 'session:entry', {
      sessionId: session.id,
      plate,
      entryTime: session.entryTime,
      isWhitelisted,
      isBlacklisted,
      locationId: camera.locationId,
    });

    // Alert for blacklisted vehicles
    if (isBlacklisted && alertLevel === 'CRITICAL') {
      this.parkingGateway.emitToOrganization(organizationId, 'alert:blacklist', {
        plate,
        reason: blacklistResult.reason,
        sessionId: session.id,
      });
    }

    this.logger.log(`Entry: session=${session.id}, plate=${plate}, location=${camera.location.name}`);

    return {
      sessionId: session.id,
      plate,
      entryTime: session.entryTime,
      isWhitelisted,
      isBlacklisted,
      barrierOpened: !isBlacklisted || alertLevel !== 'CRITICAL',
    };
  }

  /**
   * Handle vehicle exit from ALPR camera
   */
  async processExit(dto: ExitEventDto, organizationId: string): Promise<{
    sessionId: string;
    plate: string;
    duration: number;
    amount: number;
    paymentStatus: string;
    barrierOpened: boolean;
  }> {
    const plate = this.normalizePlate(dto.plate);

    // Find active session for this plate
    const session = await this.prisma.parkingSession.findFirst({
      where: {
        plateNumber: plate,
        status: 'ACTIVE',
        location: { organizationId },
      },
      include: { location: true },
    });

    if (!session) {
      throw new NotFoundException(`No active session found for plate ${plate}`);
    }

    const exitTime = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const duration = Math.round((exitTime.getTime() - session.entryTime.getTime()) / 60000); // minutes

    // Check whitelist - whitelisted vehicles pass free
    const isWhitelisted = await this.whitelistService.isWhitelisted(plate, organizationId);
    
    // Check if session was prepaid
    const wasPrepaid = session.paymentStatus === 'PAID';

    let amount = 0;
    let barrierOpened = true;
    let paymentStatus = 'PAID';
    let status = 'COMPLETED';

    if (!isWhitelisted && !wasPrepaid) {
      // Calculate tariff
      amount = await this.tariffService.calculateAmount(
        session.locationId,
        duration,
        session.entryTime,
      );

      if (amount > 0) {
        barrierOpened = false; // Require payment
        paymentStatus = 'PENDING';
        status = 'ACTIVE';
      }
    }

    // Update session
    await this.prisma.parkingSession.update({
      where: { id: session.id },
      data: {
        exitCameraId: dto.cameraId,
        exitDeviceId: dto.deviceId,
        exitTime,
        duration,
        amount: amount > 0 ? amount : session.amount,
        status,
        paymentStatus,
      },
    });

    // Emit events
    this.parkingGateway.emitToLocation(session.locationId, 'session:exit', {
      sessionId: session.id,
      plate,
      duration,
      amount,
      paymentStatus,
    });

    this.logger.log(`Exit: session=${session.id}, plate=${plate}, duration=${duration}min, amount=${amount}kop`);

    return {
      sessionId: session.id,
      plate,
      duration,
      amount,
      paymentStatus,
      barrierOpened,
    };
  }

  /**
   * Complete payment for a session
   */
  async completePayment(sessionId: string, paymentMethod: string): Promise<void> {
    const session = await this.prisma.parkingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.parkingSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod as any,
        paidAt: new Date(),
      },
    });

    this.parkingGateway.emitToLocation(session.locationId, 'session:paid', {
      sessionId,
      amount: session.amount,
    });
  }

  /**
   * Get active sessions for a location
   */
  async getActiveSessions(locationId: string): Promise<any[]> {
    return this.prisma.parkingSession.findMany({
      where: {
        locationId,
        status: 'ACTIVE',
      },
      include: {
        vehicle: true,
      },
      orderBy: { entryTime: 'desc' },
    });
  }

  /**
   * Get session statistics for dashboard
   */
  async getStatistics(organizationId: string, locationId?: string): Promise<{
    activeSessions: number;
    todayRevenue: number;
    todayEntries: number;
    todayExits: number;
    avgDuration: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      organizationId,
      createdAt: { gte: today },
    };
    if (locationId) where.locationId = locationId;

    const [sessions, completedToday, activeCount] = await Promise.all([
      this.prisma.parkingSession.findMany({ where }),
      this.prisma.parkingSession.findMany({
        where: {
          ...where,
          status: 'COMPLETED',
          exitTime: { gte: today },
        },
      }),
      this.prisma.parkingSession.count({
        where: { organizationId, status: 'ACTIVE', locationId },
      }),
    ]);

    const todayRevenue = completedToday.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalDuration = completedToday.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = completedToday.length > 0 
      ? Math.round(totalDuration / completedToday.length) 
      : 0;

    return {
      activeSessions: activeCount,
      todayRevenue,
      todayEntries: sessions.filter(s => s.entryTime >= today).length,
      todayExits: completedToday.length,
      avgDuration,
    };
  }

  /**
   * Normalize plate number (Latin to Cyrillic)
   */
  private normalizePlate(plate: string): string {
    const latinToCyrillic: Record<string, string> = {
      'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н', 'K': 'К',
      'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т', 'X': 'Х', 'Y': 'У',
    };
    
    return plate.toUpperCase().split('').map(c => latinToCyrillic[c] || c).join('');
  }
}