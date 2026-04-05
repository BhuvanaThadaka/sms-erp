import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Class, ClassDocument } from './schemas/class.schema';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateClassDto, performedBy: string): Promise<ClassDocument> {
    const existing = await this.classModel.findOne({
      grade: dto.grade, section: dto.section, academicYear: dto.academicYear,
    });
    if (existing) throw new ConflictException('Class with same grade, section, and year already exists');

    const created = new this.classModel(dto);
    const saved = await created.save();

    await this.auditLogsService.log({
      action: AuditAction.CLASS_CREATED,
      performedBy,
      entityType: 'Class',
      entityId: saved._id.toString(),
      details: { name: saved.name },
    });

    return saved.populate(['classTeacher', 'teachers']);
  }

  async findAll(
    academicYear?: string, 
    page: number = 1, 
    limit: number = 100,
    classTeacher?: string
  ): Promise<{ classes: ClassDocument[], total: number, totalPages: number, page: number, limit: number }> {
    const filter: any = { isActive: true };
    if (academicYear) filter.academicYear = academicYear;
    if (classTeacher) filter.classTeacher = new Types.ObjectId(classTeacher);
    
    const skip = (page - 1) * limit;
    const [classes, total] = await Promise.all([
      this.classModel.find(filter)
        .populate('classTeacher', 'firstName lastName email')
        .populate('teachers', 'firstName lastName email')
        .sort({ grade: 1, section: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.classModel.countDocuments(filter)
    ]);

    return {
      classes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: string): Promise<ClassDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Class not found');
    const cls = await this.classModel.findById(id)
      .populate('classTeacher', 'firstName lastName email')
      .populate('teachers', 'firstName lastName email');
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async update(id: string, dto: UpdateClassDto): Promise<ClassDocument> {
    const cls = await this.classModel.findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('classTeacher', 'firstName lastName email')
      .populate('teachers', 'firstName lastName email');
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async assignTeacher(classId: string, teacherId: string): Promise<ClassDocument> {
    const cls = await this.classModel.findByIdAndUpdate(
      classId,
      { 
        $set: { classTeacher: new Types.ObjectId(teacherId) },
        $addToSet: { teachers: new Types.ObjectId(teacherId) } 
      },
      { new: true },
    ).populate('classTeacher', 'firstName lastName email').populate('teachers', 'firstName lastName email');
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async getTeacherClasses(teacherId: string, isClassTeacher?: boolean): Promise<ClassDocument[]> {
    const query: any = { isActive: true };
    
    if (isClassTeacher) {
      query.classTeacher = new Types.ObjectId(teacherId);
    } else {
      query.$or = [
        { classTeacher: new Types.ObjectId(teacherId) },
        { teachers: new Types.ObjectId(teacherId) },
      ];
    }

    return this.classModel.find(query).populate('classTeacher', 'firstName lastName email');
  }
}
