import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/event.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateEventDto, createdBy: string): Promise<EventDocument> {
    const event = new this.eventModel({
      ...dto,
      createdBy: new Types.ObjectId(createdBy),
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      applicableClasses: dto.applicableClasses?.map((id) => new Types.ObjectId(id)) || [],
    });
    const saved = await event.save();

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

    return this.eventModel.find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('applicableClasses', 'name grade section')
      .sort({ startDate: 1 })
      .exec();
  }

  async findById(id: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(id).populate(['createdBy', 'applicableClasses']);
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
}
