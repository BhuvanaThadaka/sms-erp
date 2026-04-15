import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Class, ClassDocument } from '../classes/schemas/class.schema';
import { Attendance, AttendanceDocument } from '../attendance/schemas/attendance.schema';
import { Report, ReportDocument } from '../reports/schemas/report.schema';
import { Role, AttendanceStatus } from '../common/enums';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  async getAdminStats(academicYear: string) {
    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalReports,
      recentUsers,
    ] = await Promise.all([
      this.userModel.countDocuments({ role: Role.STUDENT, isActive: true }),
      this.userModel.countDocuments({ role: Role.TEACHER, isActive: true }),
      this.classModel.countDocuments({ academicYear, isActive: true }),
      this.reportModel.countDocuments({ academicYear }),
      this.userModel.find().sort({ createdAt: -1 }).limit(5).select('firstName lastName email role _id'),
    ]);

    // Attendance Trend for last 7 days
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const start = startOfDay(date);
      const end = endOfDay(date);

      const [present, absent] = await Promise.all([
        this.attendanceModel.countDocuments({
          date: { $gte: start, $lte: end },
          status: AttendanceStatus.PRESENT,
        }),
        this.attendanceModel.countDocuments({
          date: { $gte: start, $lte: end },
          status: AttendanceStatus.ABSENT,
        }),
      ]);

      attendanceTrend.push({
        day: format(date, 'EEE'),
        present,
        absent,
      });
    }

    // Reports by Quarter
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const reportsByQuarter = await Promise.all(
      quarters.map(async (q) => {
        const count = await this.reportModel.countDocuments({
          academicYear,
          quarter: q,
        });
        return { quarter: q, count };
      }),
    );

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalReports,
      attendanceTrend,
      reportsByQuarter,
      recentUsers,
    };
  }
}
