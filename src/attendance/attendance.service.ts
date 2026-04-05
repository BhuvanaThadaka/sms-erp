import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { MarkAttendanceDto, BulkMarkAttendanceDto, AttendanceFilterDto } from './dto/attendance.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

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

  async getClassAttendanceSummary(classId: string, dateStr: string, academicYear: string) {
    const date = new Date(dateStr);
    const startMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

    const [dailyRecords, monthlyRecords, yearlyRecords] = await Promise.all([
      this.attendanceModel.find({ classId: new Types.ObjectId(classId), date }),
      this.attendanceModel.find({ classId: new Types.ObjectId(classId), date: { $gte: startMonth, $lte: endMonth } }),
      this.attendanceModel.find({ classId: new Types.ObjectId(classId), academicYear }),
    ]);

    const calculateStats = (records: any[]) => {
      const workingDays = records.filter(r => new Date(r.date).getUTCDay() !== 0);
      const total = workingDays.length;
      const present = workingDays.filter(r => r.status === 'PRESENT').length;
      const absent = workingDays.filter(r => r.status === 'ABSENT').length;
      const late = workingDays.filter(r => r.status === 'LATE').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      return { total, present, absent, late, percentage };
    };

    const calculateStudentStats = (records: any[]) => {
      const stats: Record<string, any> = {};
      const workingDays = records.filter(r => new Date(r.date).getUTCDay() !== 0);
      workingDays.forEach(r => {
        const sid = r.studentId.toString();
        if (!stats[sid]) stats[sid] = { total: 0, present: 0 };
        stats[sid].total++;
        if (r.status === 'PRESENT') stats[sid].present++;
      });
      
      Object.keys(stats).forEach(sid => {
        stats[sid].percentage = stats[sid].total > 0 
          ? Math.round((stats[sid].present / stats[sid].total) * 100) 
          : 0;
      });
      return stats;
    };

    const dailyStd = calculateStudentStats(dailyRecords);
    const monthlyStd = calculateStudentStats(monthlyRecords);
    const yearlyStd = calculateStudentStats(yearlyRecords);

    // Weekly stats
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const weekRecords = await this.attendanceModel.find({
      classId: new Types.ObjectId(classId),
      date: { $gte: weekStart, $lte: weekEnd }
    });

    const weeklyStudentData: Record<string, any> = {};
    weekRecords.forEach(r => {
      const sid = r.studentId.toString();
      const dStr = format(r.date, 'yyyy-MM-dd');
      if (!weeklyStudentData[sid]) weeklyStudentData[sid] = {};
      weeklyStudentData[sid][dStr] = r.status;
    });

    const weekDays = [1, 2, 3, 4, 5, 6, 0].map(d => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + (d === 0 ? 6 : d - 1));
        return format(day, 'yyyy-MM-dd');
    });

    // Merge student stats
    const studentStats: Record<string, any> = {};
    const allStudentIds = new Set([...Object.keys(dailyStd), ...Object.keys(monthlyStd), ...Object.keys(yearlyStd), ...Object.keys(weeklyStudentData)]);
    
    allStudentIds.forEach(sid => {
      studentStats[sid] = {
        daily: dailyStd[sid]?.percentage || 0,
        monthly: monthlyStd[sid]?.percentage || 0,
        yearly: yearlyStd[sid]?.percentage || 0,
        weekly: weeklyStudentData[sid] || {},
      };
    });

    return {
      daily: calculateStats(dailyRecords),
      monthly: calculateStats(monthlyRecords),
      yearly: calculateStats(yearlyRecords),
      weekDays,
      studentStats,
    };
  }
}
