import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/school-erp',
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get('JWT_SECRET'),
        });
        client.data.userId = payload.sub;
        client.data.role = payload.role;
        this.logger.log(`Client connected: ${client.id} (${payload.role})`);
      }
    } catch (err) {
      this.logger.warn(`Unauthorized WS connection attempt: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinClass')
  handleJoinClass(@MessageBody() classId: string, @ConnectedSocket() client: Socket) {
    client.join(`class:${classId}`);
    this.logger.log(`${client.id} joined class room: ${classId}`);
    return { event: 'joinedClass', classId };
  }

  @SubscribeMessage('leaveClass')
  handleLeaveClass(@MessageBody() classId: string, @ConnectedSocket() client: Socket) {
    client.leave(`class:${classId}`);
    return { event: 'leftClass', classId };
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    client.join(`user:${userId}`);
    return { event: 'joinedUserRoom', userId };
  }

  // Emit attendance update to class room
  emitAttendanceUpdate(classId: string, data: any) {
    this.server.to(`class:${classId}`).emit('attendanceUpdate', data);
    this.logger.log(`Attendance update emitted to class:${classId}`);
  }

  // Emit session update to class room
  emitSessionUpdate(classId: string, data: any) {
    this.server.to(`class:${classId}`).emit('sessionUpdate', data);
  }

  // Emit schedule update to class room
  emitScheduleUpdate(classId: string, data: any) {
    this.server.to(`class:${classId}`).emit('scheduleUpdate', data);
  }

  // Emit report generated to specific student
  emitReportGenerated(studentId: string, data: any) {
    this.server.to(`user:${studentId}`).emit('reportGenerated', data);
  }

  // Emit event notification to specific users
  emitEventNotification(userIds: string[], data: any) {
    userIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('systemNotification', data);
    });
    this.logger.log(`Event notification emitted to ${userIds.length} users`);
  }

  // Broadcast system-wide notification
  broadcastNotification(data: any) {
    this.server.emit('systemNotification', data);
  }
}
