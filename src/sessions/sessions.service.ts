import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly appGateway: AppGateway,
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
