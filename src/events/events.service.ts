import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/event.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, EventType, Role } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Class, ClassDocument } from '../classes/schemas/class.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly appGateway: AppGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateEventDto, createdBy: string): Promise<EventDocument> {
    console.log('EventsService.create called by:', createdBy);
    
    // Get creator's role
    const creator = await this.userModel.findById(createdBy).select('role');
    if (!creator) throw new Error('Creator not found');
    
    const event = new this.eventModel({
      ...dto,
      createdBy: new Types.ObjectId(createdBy),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      applicableClasses: dto.applicableClasses?.map((id) => new Types.ObjectId(id)) || [],
    });
    const saved = await event.save();
    await saved.populate('applicableClasses', 'name grade section');
    
    // Trigger real-time notifications
    this.sendEventNotifications(saved, creator.role).catch(err => {
      console.error('Failed to send event notifications:', err);
    });

    await this.auditLogsService.log({
      action: AuditAction.EVENT_CREATED,
      performedBy: createdBy,
      entityType: 'Event',
      entityId: saved._id.toString(),
      details: { title: saved.title, type: saved.type },
    });

    return saved;
  }

  async findAll(query: { startDate?: string; endDate?: string; classId?: string; academicYear?: string }): Promise<EventDocument[]> {
    const filter: any = { isActive: true };
    if (query.academicYear) filter.academicYear = query.academicYear;

    if (query.startDate && query.endDate) {
      filter.startDate = { $gte: new Date(query.startDate) };
      filter.endDate = { $lte: new Date(query.endDate) };
    } else if (query.startDate) {
      filter.startDate = { $gte: new Date(query.startDate) };
    }

    if (query.classId) {
      filter.$or = [
        { isAllClasses: true },
        { applicableClasses: new Types.ObjectId(query.classId) },
      ];
    }

    const results = await this.eventModel.find(filter)
      .populate({ path: 'createdBy', select: 'firstName lastName' })
      .populate({ path: 'applicableClasses', select: 'name grade section' })
      .sort({ startDate: 1 })
      .exec();
    
    console.log(`findAll returned ${results.length} events. First event classes:`, results[0]?.applicableClasses);
    return results;
  }

  async findById(id: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(id).populate([
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'applicableClasses', select: 'name grade section' }
    ]);
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: string, dto: Partial<CreateEventDto>): Promise<EventDocument> {
    const event = await this.eventModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.eventModel.findByIdAndUpdate(id, { isActive: false });
    return { message: 'Event removed' };
  }

  private async sendEventNotifications(event: EventDocument, creatorRole: string) {
    const notificationData = {
      message: `New ${event.type.toLowerCase()} event: ${event.title}`,
      type: 'EVENT_CREATED',
      data: {
        eventId: event._id,
        title: event.title,
        type: event.type,
        startDate: event.startDate,
        venue: event.venue,
      },
    };

    let targetUserIds: string[] = [];

    // Determine who to notify based on creator's role and event scope
    if (event.isAllClasses) {
      console.log(`Global event created by ${creatorRole}: ${event.title} - notifying all teachers and students`);
      const users = await this.userModel.find({
        role: { $in: [Role.TEACHER, Role.STUDENT] },
        isActive: true,
      }).select('_id');
      targetUserIds = users.map((u) => u._id.toString());
    } else {
      // Class-specific event
      console.log(`Class-specific event created by ${creatorRole}: ${event.title} for classes: ${event.applicableClasses}`);
      const classes = await this.classModel.find({
        _id: { $in: event.applicableClasses },
      });

      const teacherIds = new Set<string>();
      classes.forEach((c) => {
        if (c.classTeacher) teacherIds.add(c.classTeacher.toString());
        c.teachers?.forEach((t) => teacherIds.add(t.toString()));
      });

      const students = await this.userModel.find({
        role: Role.STUDENT,
        classId: { $in: event.applicableClasses },
      }).select('_id');

      const studentIds = students.map((s) => s._id.toString());
      
      const adminIds = [];
      if (creatorRole === Role.TEACHER) {
        const admins = await this.userModel.find({ role: Role.ADMIN, isActive: true }).select('_id');
        admins.forEach(a => adminIds.push(a._id.toString()));
      }

      targetUserIds = Array.from(new Set([...teacherIds, ...studentIds, ...adminIds]));
    }

    console.log(`Recipients found: ${targetUserIds.length}`);

    if (targetUserIds.length > 0) {
      // Persist notifications in DB
      const notifications = targetUserIds.map(userId => ({
        userId,
        title: event.title,
        message: notificationData.message,
        type: 'EVENT_CREATED',
        data: notificationData.data,
        isRead: false
      }));

      let savedNotifications = [];
      try {
        savedNotifications = await this.notificationsService.createMany(notifications);
        console.log(`Persisted ${notifications.length} notifications in DB. First ID: ${savedNotifications[0]?._id}`);
      } catch (err) {
        console.error('Failed to persist notifications:', err);
      }

      // Emit real-time WS notifications with actual database _ids
      savedNotifications.forEach(notif => {
        console.log(`Emitting notification to ${notif.userId}: ${notif._id}`);
        this.appGateway.emitNotificationToUser(notif.userId.toString(), notif);
      });
    }
  }
}
