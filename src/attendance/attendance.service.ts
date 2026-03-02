import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { MarkAttendanceDto, BulkMarkAttendanceDto, AttendanceFilterDto } from './dto/attendance.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    private readonly auditLogsService: AuditLogsService,
    private readonly appGateway: AppGateway,
  ) {}

  async markAttendance(dto: MarkAttendanceDto, performedBy: string): Promise<AttendanceDocument> {
    const attendanceDate = new Date(dto.date);

    const existing = await this.attendanceModel.findOne({
      studentId: new Types.ObjectId(dto.studentId),
      classId: new Types.ObjectId(dto.classId),
      date: attendanceDate,
    });

    let record: AttendanceDocument;
    if (existing) {
      existing.status = dto.status;
      existing.remarks = dto.remarks;
      existing.markedBy = new Types.ObjectId(performedBy) as any;
      existing.markedAt = new Date();
      record = await existing.save();
    } else {
      const newRecord = new this.attendanceModel({
        ...dto,
        date: attendanceDate,
        studentId: new Types.ObjectId(dto.studentId),
        classId: new Types.ObjectId(dto.classId),
        markedBy: new Types.ObjectId(performedBy),
      });
      record = await newRecord.save();
    }

    await record.populate(['studentId', 'classId', 'markedBy']);

    await this.auditLogsService.log({
      action: existing ? AuditAction.ATTENDANCE_UPDATED : AuditAction.ATTENDANCE_MARKED,
      performedBy,
      entityType: 'Attendance',
      entityId: record._id.toString(),
      details: { studentId: dto.studentId, status: dto.status, date: dto.date },
    });

    // Emit real-time event
    this.appGateway.emitAttendanceUpdate(dto.classId, {
      attendanceId: record._id,
      studentId: dto.studentId,
      status: dto.status,
      date: dto.date,
      markedBy: performedBy,
    });

    return record;
  }

  async bulkMarkAttendance(dto: BulkMarkAttendanceDto, performedBy: string) {
    const results = [];
    for (const record of dto.records) {
      const result = await this.markAttendance(
        {
          studentId: record.studentId,
          classId: dto.classId,
          status: record.status,
          date: dto.date,
          academicYear: dto.academicYear,
          remarks: record.remarks,
        },
        performedBy,
      );
      results.push(result);
    }
    return results;
  }

  async getAttendance(filter: AttendanceFilterDto): Promise<AttendanceDocument[]> {
    const query: any = {};

    if (filter.classId) query.classId = new Types.ObjectId(filter.classId);
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId);
    if (filter.academicYear) query.academicYear = filter.academicYear;

    if (filter.date) {
      const d = new Date(filter.date);
      query.date = d;
    } else if (filter.month) {
      const [year, month] = filter.month.split('-');
      query.date = {
        $gte: new Date(Number(year), Number(month) - 1, 1),
        $lte: new Date(Number(year), Number(month), 0),
      };
    }

    return this.attendanceModel.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('classId', 'name grade section')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 })
      .exec();
  }

  async getStudentAttendanceSummary(studentId: string, academicYear: string) {
    const records = await this.attendanceModel.find({
      studentId: new Types.ObjectId(studentId),
      academicYear,
    });

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, percentage };
  }

  async getClassAttendanceStats(classId: string, date: string) {
    const records = await this.attendanceModel.find({
      classId: new Types.ObjectId(classId),
      date: new Date(date),
    });

    return {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
    };
  }
}
