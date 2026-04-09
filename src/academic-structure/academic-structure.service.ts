import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicStructure, AcademicStructureDocument } from './schemas/academic-structure.schema';
import { CreateAcademicStructureDto, UpdateAcademicStructureDto } from './dto/academic-structure.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';

@Injectable()
export class AcademicStructureService {
  constructor(
    @InjectModel(AcademicStructure.name) private model: Model<AcademicStructureDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateAcademicStructureDto, performedBy: string): Promise<AcademicStructureDocument> {
    const created = new this.model(dto);
    const saved = await created.save();

    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_STRUCTURE_CREATED,
      performedBy,
      entityType: 'AcademicStructure',
      entityId: saved._id.toString(),
      details: { name: saved.name },
    });

    return saved;
  }

  async findAll(params: any = {}): Promise<AcademicStructureDocument[]> {
    return this.model.find({ isActive: true, ...params }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<AcademicStructureDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Academic Structure not found');
    const structure = await this.model.findById(id).exec();
    if (!structure) throw new NotFoundException('Academic Structure not found');
    return structure;
  }

  async update(id: string, dto: UpdateAcademicStructureDto, performedBy: string): Promise<AcademicStructureDocument> {
    const updated = await this.model.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
    if (!updated) throw new NotFoundException('Academic Structure not found');

    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_STRUCTURE_UPDATED,
      performedBy,
      entityType: 'AcademicStructure',
      entityId: updated._id.toString(),
      details: { name: updated.name },
    });

    return updated;
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Academic Structure not found');
    return { success: true, message: 'Academic Structure deleted successfully' };
  }
}
