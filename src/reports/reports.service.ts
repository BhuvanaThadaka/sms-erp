import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { GenerateReportDto, BulkGenerateReportDto } from './dto/report.dto';
import { AttendanceService } from '../attendance/attendance.service';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';
import { AppGateway } from '../websockets/app.gateway';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    private readonly attendanceService: AttendanceService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
    private readonly appGateway: AppGateway,
    private readonly configService: ConfigService,
  ) {}

  async generateReport(dto: GenerateReportDto, generatedBy: string): Promise<ReportDocument> {
    const existingReport = await this.reportModel.findOne({
      studentId: new Types.ObjectId(dto.studentId),
      quarter: dto.quarter,
      academicYear: dto.academicYear,
    });

    if (existingReport) throw new ConflictException('Report already exists for this student/quarter/year');

    const summary = await this.attendanceService.getStudentAttendanceSummary(dto.studentId, dto.academicYear);
    const performance = this.calculatePerformance(summary.percentage);

    const report = new this.reportModel({
      studentId: new Types.ObjectId(dto.studentId),
      classId: new Types.ObjectId(dto.classId),
      generatedBy: new Types.ObjectId(generatedBy),
      quarter: dto.quarter,
      academicYear: dto.academicYear,
      attendancePercentage: summary.percentage,
      totalDays: summary.total,
      presentDays: summary.present,
      absentDays: summary.absent,
      lateDays: summary.late,
      teacherRemarks: dto.teacherRemarks || 'No remarks provided.',
      participationSummary: dto.participationSummary || 'Satisfactory participation.',
      overallPerformance: dto.overallPerformance || performance,
    });

    const saved = await report.save();
    saved.pdfUrl = `/api/v1/reports/${saved._id}/pdf`;
    await saved.save();

    await this.auditLogsService.log({
      action: AuditAction.REPORT_GENERATED,
      performedBy: generatedBy,
      entityType: 'Report',
      entityId: saved._id.toString(),
      details: { studentId: dto.studentId, quarter: dto.quarter, academicYear: dto.academicYear },
    });

    this.appGateway.emitReportGenerated(dto.studentId, {
      reportId: saved._id,
      quarter: dto.quarter,
      academicYear: dto.academicYear,
      pdfUrl: saved.pdfUrl,
    });

    return saved.populate(['studentId', 'classId', 'generatedBy']);
  }

  async bulkGenerate(dto: BulkGenerateReportDto, generatedBy: string) {
    const students = await this.usersService.getStudentsByClass(dto.classId);
    const results = [];

    for (const student of students) {
      try {
        const report = await this.generateReport(
          { ...dto, studentId: student._id.toString() },
          generatedBy,
        );
        results.push({ success: true, studentId: student._id, report });
      } catch (err) {
        results.push({ success: false, studentId: student._id, error: err.message });
      }
    }

    return results;
  }

  async findReports(studentId?: string, classId?: string, quarter?: string, academicYear?: string) {
    const filter: any = {};
    if (studentId) filter.studentId = new Types.ObjectId(studentId);
    if (classId) filter.classId = new Types.ObjectId(classId);
    if (quarter) filter.quarter = quarter;
    if (academicYear) filter.academicYear = academicYear;

    return this.reportModel.find(filter)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('classId', 'name grade section')
      .populate('generatedBy', 'firstName lastName')
      .sort({ generatedAt: -1 });
  }

  async findById(id: string): Promise<ReportDocument> {
    const report = await this.reportModel.findById(id)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('classId', 'name grade section');
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  private calculatePerformance(percentage: number): string {
    if (percentage >= 90) return 'EXCELLENT';
    if (percentage >= 75) return 'GOOD';
    if (percentage >= 60) return 'AVERAGE';
    return 'BELOW_AVERAGE';
  }

  async generatePdf(id: string): Promise<Buffer> {
    const report = await this.findById(id);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('School ERP - General Progress Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica').text(`Quarter: ${report.quarter} | Academic Year: ${report.academicYear}`, { align: 'center' });
      doc.moveDown(1);

      // Divider
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // Student Info
      doc.fontSize(12).font('Helvetica-Bold').text('Student Info');
      doc.font('Helvetica').fontSize(11);
      doc.text(`Name: ${report.studentId?.['firstName']} ${report.studentId?.['lastName']}`);
      doc.text(`Enrollment No: ${report.studentId?.['enrollmentNumber']}`);
      doc.text(`Class: ${report.classId?.['name']}`);
      doc.moveDown(1);

      // Attendance Summary
      doc.fontSize(12).font('Helvetica-Bold').text('Attendance Summary');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(`Total Days: ${report.totalDays}`);
      doc.text(`Present: ${report.presentDays}`);
      doc.text(`Absent: ${report.absentDays}`);
      doc.text(`Late: ${report.lateDays}`);
      doc.text(`Attendance Percentage: ${report.attendancePercentage}%`);
      doc.moveDown(1);

      // Remarks
      doc.font('Helvetica-Bold').fontSize(12).text('Teacher Remarks:');
      doc.font('Helvetica').fontSize(11).text(report.teacherRemarks || 'No remarks.');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(12).text('Participation:');
      doc.font('Helvetica').fontSize(11).text(report.participationSummary || 'Satisfactory.');
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(12).text(`Overall Performance: ${report.overallPerformance}`);
      doc.moveDown(2);

      // Footer
      doc.fontSize(9).fillColor('gray').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });

      doc.end();
    });
  }

  async findByComposite(studentId: string, quarter: string, academicYear: string): Promise<ReportDocument> {
    const report = await this.reportModel.findOne({
      studentId: new Types.ObjectId(studentId),
      quarter: quarter as any,
      academicYear,
    })
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('classId', 'name grade section');
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
