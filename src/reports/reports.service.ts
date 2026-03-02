import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import * as fs from 'fs';
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
    const pdfPath = await this.generatePDF(dto, summary, generatedBy);
    const baseUrl = this.configService.get('PDF_BASE_URL', 'http://localhost:3000/reports');
    const pdfUrl = `${baseUrl}/${path.basename(pdfPath)}`;

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
      pdfUrl,
    });

    const saved = await report.save();

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
      pdfUrl,
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

  private async generatePDF(dto: GenerateReportDto, summary: any, generatedBy: string): Promise<string> {
    const storagePath = this.configService.get('PDF_STORAGE_PATH', './uploads/reports');
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

    const fileName = `report_${dto.studentId}_${dto.quarter}_${dto.academicYear}_${Date.now()}.pdf`;
    const filePath = path.join(storagePath, fileName);

    return new Promise((resolve, reject) => {
      try {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('School ERP - Student Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica').text(`Quarter: ${dto.quarter} | Academic Year: ${dto.academicYear}`, { align: 'center' });
        doc.moveDown(1);

        // Divider
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(1);

        // Attendance Summary
        doc.fontSize(12).font('Helvetica-Bold').text('Attendance Summary');
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(11);
        doc.text(`Total Days: ${summary.total}`);
        doc.text(`Present: ${summary.present}`);
        doc.text(`Absent: ${summary.absent}`);
        doc.text(`Late: ${summary.late}`);
        doc.text(`Attendance Percentage: ${summary.percentage}%`);
        doc.moveDown(1);

        // Remarks
        doc.font('Helvetica-Bold').fontSize(12).text('Teacher Remarks:');
        doc.font('Helvetica').fontSize(11).text(dto.teacherRemarks || 'No remarks.');
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(12).text('Participation:');
        doc.font('Helvetica').fontSize(11).text(dto.participationSummary || 'Satisfactory.');
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(12).text(`Overall Performance: ${dto.overallPerformance || this.calculatePerformance(summary.percentage)}`);
        doc.moveDown(1);

        // Footer
        doc.fontSize(9).fillColor('gray').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });

        doc.end();
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}
