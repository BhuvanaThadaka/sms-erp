import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Role } from '../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(createUserDto: CreateUserDto, performedBy?: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: createUserDto.email });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    const user = new this.userModel({ ...createUserDto, password: hashedPassword });
    const saved = await user.save();

    if (performedBy) {
      await this.auditLogsService.log({
        action: AuditAction.USER_CREATED,
        performedBy,
        entityType: 'User',
        entityId: saved._id.toString(),
        details: { email: saved.email, role: saved.role },
      });
    }

    const { password, ...result } = saved.toObject();
    return result as any;
  }

  async findAll(role?: Role, classId?: string): Promise<UserDocument[]> {
    const filter: any = { isActive: true };
    if (role) filter.role = role;
    if (classId) filter.classId = new Types.ObjectId(classId);

    return this.userModel.find(filter).select('-password').populate('classId', 'name grade section').exec();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('User not found');
    const user = await this.userModel.findById(id).select('-password').populate('classId', 'name grade section');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async update(id: string, updateUserDto: UpdateUserDto, performedBy: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateUserDto },
      { new: true, runValidators: true },
    ).select('-password').populate('classId', 'name grade section');

    if (!user) throw new NotFoundException('User not found');

    await this.auditLogsService.log({
      action: AuditAction.PROFILE_UPDATED,
      performedBy,
      entityType: 'User',
      entityId: id,
      details: updateUserDto,
    });

    return user;
  }

  async deactivate(id: string): Promise<{ message: string }> {
    const user = await this.userModel.findByIdAndUpdate(id, { isActive: false });
    if (!user) throw new NotFoundException('User not found');
    return { message: 'User deactivated successfully' };
  }

  async getStudentsByClass(classId: string): Promise<UserDocument[]> {
    return this.userModel.find({
      classId: new Types.ObjectId(classId),
      role: Role.STUDENT,
      isActive: true,
    }).select('-password');
  }

  async assignStudentToClass(studentId: string, classId: string, adminId: string): Promise<UserDocument> {
    const student = await this.userModel.findByIdAndUpdate(
      studentId,
      { $set: { classId: new Types.ObjectId(classId) } },
      { new: true },
    ).select('-password').populate('classId', 'name grade section');

    if (!student) throw new NotFoundException('Student not found');

    await this.auditLogsService.log({
      action: AuditAction.STUDENT_ASSIGNED_TO_CLASS,
      performedBy: adminId,
      entityType: 'User',
      entityId: studentId,
      details: { classId },
    });

    return student;
  }

  async bulkAssignStudentsToClass(studentIds: string[], classId: string, adminId: string) {
    const results = [];
    for (const id of studentIds) {
      try {
        const student = await this.assignStudentToClass(id, classId, adminId);
        results.push({ success: true, studentId: id, student });
      } catch (err) {
        results.push({ success: false, studentId: id, error: err.message });
      }
    }
    return results;
  }
}
