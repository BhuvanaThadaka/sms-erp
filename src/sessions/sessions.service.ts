import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, Role } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';

import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly appGateway: AppGateway,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateSessionDto, teacherId: string): Promise<SessionDocument> {
    const session = new this.sessionModel({
      ...dto,
      teacher: new Types.ObjectId(teacherId),
      classId: new Types.ObjectId(dto.classId),
      sessionDate: new Date(dto.sessionDate),
    });
    const saved = await session.save();
    await saved.populate(['teacher', 'classId']);

    // Trigger real-time notifications for students in the class
    this.sendSessionNotifications(saved).catch(err => {
      console.error('Failed to send session notifications:', err);
    });

    await this.auditLogsService.log({
      action: AuditAction.SESSION_CREATED,
      performedBy: teacherId,
      entityType: 'Session',
      entityId: saved._id.toString(),
      details: { topic: saved.topic, classId: dto.classId },
    });

    this.appGateway.emitSessionUpdate(dto.classId, {
      sessionId: saved._id,
      topic: saved.topic,
      teacher: teacherId,
      sessionDate: dto.sessionDate,
    });

    return saved;
  }

  private async sendSessionNotifications(session: SessionDocument) {
    const classId = (session.classId as any)._id || session.classId;
    console.log(`Sending session notifications for class: ${classId}`);
    
    // Get students in the class
    const students = await this.usersService.getStudentsByClass(classId.toString());
    console.log(`Found ${students.length} students for class ${classId}`);
    
    // Get all admins
    const admins = await this.userModel.find({
      role: Role.ADMIN,
      isActive: true,
    }).select('_id');
    
    const studentIds = students.map(s => s._id.toString());
    const adminIds = admins.map(a => a._id.toString());
    const targetUserIds = Array.from(new Set([...studentIds, ...adminIds]));
    
    console.log(`Total recipients: ${targetUserIds.length} (students: ${studentIds.length}, admins: ${adminIds.length})`);
    
    if (targetUserIds.length === 0) {
      console.log(`No recipients found for class: ${classId}`);
      return;
    }

    const notificationData = {
      title: 'New Session Scheduled',
      message: `New session scheduled: ${session.topic}`,
      type: 'SESSION_CREATED',
      data: {
        sessionId: session._id,
        topic: session.topic,
        classId: session.classId,
        sessionDate: session.sessionDate,
        teacher: session.teacher,
      },
    };

    // Persist in DB
    const notifications = targetUserIds.map(userId => ({
      userId,
      title: notificationData.title,
      message: notificationData.message,
      type: 'SESSION_CREATED',
      data: notificationData.data,
      isRead: false
    }));

    const savedNotifications = await this.notificationsService.createMany(notifications);
    
    // Emit real-time WS notifications with actual database _ids
    savedNotifications.forEach(notif => {
      this.appGateway.emitNotificationToUser(notif.userId.toString(), notif);
    });
  }

  async findAll(classId?: string, teacherId?: string, academicYear?: string): Promise<SessionDocument[]> {
    const filter: any = {};
    if (classId) filter.classId = new Types.ObjectId(classId);
    if (teacherId) filter.teacher = new Types.ObjectId(teacherId);
    if (academicYear) filter.academicYear = academicYear;

    return this.sessionModel.find(filter)
      .populate('teacher', 'firstName lastName')
      .populate('classId', 'name grade section')
      .sort({ sessionDate: -1 })
      .exec();
  }

  async findById(id: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findById(id)
      .populate('teacher', 'firstName lastName')
      .populate('classId', 'name grade section');
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async update(id: string, dto: UpdateSessionDto, performedBy: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate(['teacher', 'classId']);
    if (!session) throw new NotFoundException('Session not found');

    await this.auditLogsService.log({
      action: AuditAction.SESSION_UPDATED,
      performedBy,
      entityType: 'Session',
      entityId: id,
      details: dto,
    });

    return session;
  }
}
