import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Schedule, ScheduleDocument } from './schemas/schedule.schema';
import { CreateScheduleDto, RescheduleDto } from './dto/schedule.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly appGateway: AppGateway,
  ) {}

  async create(dto: CreateScheduleDto, performedBy: string): Promise<ScheduleDocument> {
    const schedule = new this.scheduleModel({
      ...dto,
      classId: new Types.ObjectId(dto.classId),
      teacher: new Types.ObjectId(dto.teacher),
    });
    const saved = await schedule.save();

    await this.auditLogsService.log({
      action: AuditAction.SCHEDULE_CREATED,
      performedBy,
      entityType: 'Schedule',
      entityId: saved._id.toString(),
      details: { subject: saved.subject, classId: dto.classId },
    });

    this.appGateway.emitScheduleUpdate(dto.classId, { type: 'CREATED', schedule: saved });
    return saved.populate(['teacher', 'classId']);
  }

  async findByClass(classId: string, academicYear?: string): Promise<ScheduleDocument[]> {
    const filter: any = { classId: new Types.ObjectId(classId), isActive: true };
    if (academicYear) filter.academicYear = academicYear;
    return this.scheduleModel.find(filter)
      .populate('teacher', 'firstName lastName')
      .sort({ dayOfWeek: 1, startTime: 1 });
  }

  async findByTeacher(teacherId: string, academicYear?: string): Promise<ScheduleDocument[]> {
    const filter: any = { teacher: new Types.ObjectId(teacherId), isActive: true };
    if (academicYear) filter.academicYear = academicYear;
    return this.scheduleModel.find(filter)
      .populate('classId', 'name grade section')
      .sort({ dayOfWeek: 1, startTime: 1 });
  }

  async reschedule(id: string, dto: RescheduleDto, performedBy: string): Promise<ScheduleDocument> {
    const schedule = await this.scheduleModel.findByIdAndUpdate(
      id,
      { $set: { rescheduledDate: new Date(dto.rescheduledDate), rescheduleReason: dto.rescheduleReason } },
      { new: true },
    ).populate(['teacher', 'classId']);

    if (!schedule) throw new NotFoundException('Schedule not found');

    this.appGateway.emitScheduleUpdate(schedule.classId.toString(), {
      type: 'RESCHEDULED',
      schedule,
    });

    return schedule;
  }

  async delete(id: string): Promise<{ message: string }> {
    await this.scheduleModel.findByIdAndUpdate(id, { isActive: false });
    return { message: 'Schedule removed' };
  }
}
