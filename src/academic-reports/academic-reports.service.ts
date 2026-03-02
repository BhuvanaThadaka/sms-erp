import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicReport, AcademicReportDocument } from './schemas/academic-report.schema';
import { GenerateAcademicReportDto, BulkGenerateReportDto } from './dto/academic-report.dto';
import { MarksService } from '../marks/marks.service';
import { UsersService } from '../users/users.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, Role } from '../common/enums';

@Injectable()
export class AcademicReportsService {
  constructor(
    @InjectModel(AcademicReport.name) private reportModel: Model<AcademicReportDocument>,
    private readonly marksService: MarksService,
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async generate(dto: GenerateAcademicReportDto, generatedBy: string): Promise<AcademicReportDocument> {
    // Check for duplicate
    const existing = await this.reportModel.findOne({
      studentId: new Types.ObjectId(dto.studentId),
      quarter: dto.quarter,
      academicYear: dto.academicYear,
    });
    if (existing) throw new ConflictException('Report already generated for this quarter. Use update instead.');

    // Fetch report card data from marks service
    const reportCard = await this.marksService.getStudentReportCard(dto.studentId, dto.academicYear, dto.classId);

    // Fetch attendance summary
    let attendancePct = 0;
    try {
      const attendance = await this.attendanceService.getStudentAttendanceSummary(dto.studentId, dto.academicYear);
      attendancePct = attendance?.percentage || 0;
    } catch {}

    const report = new this.reportModel({
      studentId: new Types.ObjectId(dto.studentId),
      classId: new Types.ObjectId(dto.classId),
      generatedBy: new Types.ObjectId(generatedBy),
      quarter: dto.quarter,
      academicYear: dto.academicYear,
      reportData: reportCard,
      totalObtained: reportCard.grandTotal.obtained,
      totalMax: reportCard.grandTotal.max,
      percentage: reportCard.overallPercentage,
      overallGrade: reportCard.overallGrade,
      attendancePercentage: attendancePct,
      teacherRemarks: dto.teacherRemarks,
      pdfUrl: `/api/v1/academic-reports/${dto.studentId}/${dto.quarter}/${dto.academicYear}/pdf`,
    });

    const saved = await report.save();

    await this.auditLogsService.log({
      action: AuditAction.ACADEMIC_REPORT_GENERATED,
      performedBy: generatedBy,
      entityType: 'AcademicReport',
      entityId: saved._id.toString(),
      details: { studentId: dto.studentId, quarter: dto.quarter },
    });

    return saved.populate([
      { path: 'studentId', select: 'firstName lastName enrollmentNumber' },
      { path: 'classId', select: 'name grade section' },
    ]);
  }

  async bulkGenerate(dto: BulkGenerateReportDto, generatedBy: string) {
    const students = await this.usersService.getStudentsByClass(dto.classId);
    const results = [];
    for (const student of students) {
      try {
        const report = await this.generate(
          { studentId: student._id.toString(), classId: dto.classId, quarter: dto.quarter, academicYear: dto.academicYear },
          generatedBy,
        );
        results.push({ success: true, studentId: student._id, report });
      } catch (err) {
        results.push({ success: false, studentId: student._id, error: err.message });
      }
    }
    return results;
  }

  async findAll(filters: {
    classId?: string;
    studentId?: string;
    quarter?: string;
    academicYear?: string;
    requestingUser: { userId: string; role: string };
  }): Promise<AcademicReportDocument[]> {
    const query: any = {};
    if (filters.classId) query.classId = new Types.ObjectId(filters.classId);
    if (filters.quarter) query.quarter = filters.quarter;
    if (filters.academicYear) query.academicYear = filters.academicYear;

    // Students see only their own
    if (filters.requestingUser.role === Role.STUDENT) {
      query.studentId = new Types.ObjectId(filters.requestingUser.userId);
    } else if (filters.studentId) {
      query.studentId = new Types.ObjectId(filters.studentId);
    }

    return this.reportModel.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('classId', 'name grade section')
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<AcademicReportDocument> {
    const report = await this.reportModel.findById(id)
      .populate('studentId', 'firstName lastName enrollmentNumber dateOfBirth')
      .populate('classId', 'name grade section academicYear')
      .populate('generatedBy', 'firstName lastName');
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
