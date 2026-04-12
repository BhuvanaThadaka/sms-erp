import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subject, SubjectDocument } from './schemas/subject.schema';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, Role } from '../common/enums';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateSubjectDto, performedBy: string): Promise<SubjectDocument> {
    const existing = await this.subjectModel.findOne({
      classId: new Types.ObjectId(dto.classId),
      code: dto.code.toUpperCase(),
      academicYear: dto.academicYear,
    });
    if (existing) throw new ConflictException('Subject with this code already exists in this class/year');

    const subject = new this.subjectModel({
      ...dto,
      code: dto.code.toUpperCase(),
      classId: new Types.ObjectId(dto.classId),
      subjectTeacher: new Types.ObjectId(dto.subjectTeacher),
    });
    const saved = await subject.save();

    await this.auditLogsService.log({
      action: AuditAction.SUBJECT_CREATED,
      performedBy,
      entityType: 'Subject',
      entityId: saved._id.toString(),
      details: { name: saved.name, code: saved.code, classId: dto.classId },
    });

    return saved.populate([
      { path: 'classId', select: 'name grade section' },
      { path: 'subjectTeacher', select: 'firstName lastName email' },
    ]);
  }

  async findAll(filters: {
    classId?: string;
    academicYear?: string;
    subjectTeacherId?: string;
  }): Promise<SubjectDocument[]> {
    const query: any = { isActive: true };
    if (filters.classId) query.classId = new Types.ObjectId(filters.classId);
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.subjectTeacherId) query.subjectTeacher = new Types.ObjectId(filters.subjectTeacherId);

    return this.subjectModel.find(query)
      .populate('classId', 'name grade section')
      .populate('subjectTeacher', 'firstName lastName email')
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<SubjectDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Subject not found');
    const subject = await this.subjectModel.findById(id)
      .populate('classId', 'name grade section')
      .populate('subjectTeacher', 'firstName lastName email');
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async findByTeacher(teacherId: string, academicYear?: string): Promise<SubjectDocument[]> {
    const query: any = { subjectTeacher: new Types.ObjectId(teacherId), isActive: true };
    if (academicYear) query.academicYear = academicYear;
    return this.subjectModel.find(query)
      .populate('classId', 'name grade section')
      .sort({ name: 1 });
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<SubjectDocument> {
    const updateData: any = { ...dto };
    if (dto.classId) updateData.classId = new Types.ObjectId(dto.classId);
    if (dto.subjectTeacher) updateData.subjectTeacher = new Types.ObjectId(dto.subjectTeacher);
    if (dto.code) updateData.code = dto.code.toUpperCase();

    const subject = await this.subjectModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).populate([
      { path: 'classId', select: 'name grade section' },
      { path: 'subjectTeacher', select: 'firstName lastName email' },
    ]);
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async delete(id: string): Promise<{ message: string }> {
    const subject = await this.subjectModel.findByIdAndUpdate(id, { isActive: false });
    if (!subject) throw new NotFoundException('Subject not found');
    return { message: 'Subject deactivated successfully' };
  }

  // Called when student is assigned to a class — returns subjects for that class
  async getSubjectsForClass(classId: string, academicYear: string): Promise<SubjectDocument[]> {
    return this.subjectModel.find({
      classId: new Types.ObjectId(classId),
      academicYear,
      isActive: true,
    }).populate('subjectTeacher', 'firstName lastName');
  }

  // Verify teacher owns the subject
  async verifyTeacherOwnsSubject(subjectId: string, teacherId: string): Promise<SubjectDocument> {
    const subject = await this.findById(subjectId);
    if (subject.subjectTeacher['_id'].toString() !== teacherId) {
      throw new ForbiddenException('You are not the assigned teacher for this subject');
    }
    return subject;
  }
}
