import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class ParkingGateway {
  @WebSocketServer()
  server: Server;

  emitToLocation(locationId: string, event: string, data: any) {
    this.server.to(`location:${locationId}`).emit(event, data);
  }

  emitToOrganization(organizationId: string, event: string, data: any) {
    this.server.to(`org:${organizationId}`).emit(event, data);
  }

  emitToDevice(deviceId: string, event: string, data: any) {
    this.server.to(`device:${deviceId}`).emit(event, data);
  }
}