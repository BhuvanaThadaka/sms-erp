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
import * as PDFDocument from 'pdfkit';

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
    });

    const saved = await report.save();

    // Update with final PDF URL (using report ID)
    saved.pdfUrl = `/api/v1/academic-reports/${saved._id}/pdf`;
    await saved.save();

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

  async generatePdf(id: string): Promise<Buffer> {
    const report = await this.findById(id);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fillColor('#0f172a').fontSize(20).text('ACADEMIC PROGRESS REPORT', { align: 'center' });
      doc.fontSize(12).fillColor('#64748b').text(`${report.quarter} — ${report.academicYear}`, { align: 'center' });
      doc.moveDown(2);

      // Student Info
      doc.fillColor('#1e293b').fontSize(14).text('Student Information', { underline: true });
      doc.fontSize(10).fillColor('#334155');
      doc.moveDown(0.5);
      doc.text(`Name: ${report.studentId?.['firstName']} ${report.studentId?.['lastName']}`);
      doc.text(`Enrollment No: ${report.studentId?.['enrollmentNumber']}`);
      doc.text(`Class: ${report.classId?.['name']} (${report.classId?.['grade']}-${report.classId?.['section']})`);
      doc.moveDown(2);

      // Summary
      doc.fillColor('#1e293b').fontSize(14).text('Performance Summary', { underline: true });
      doc.fontSize(10);
      doc.moveDown(0.5);
      doc.text(`Total Obtained: ${report.totalObtained} / ${report.totalMax}`);
      doc.text(`Percentage: ${report.percentage}%`);
      doc.text(`Overall Grade: ${report.overallGrade}`);
      doc.text(`Attendance: ${report.attendancePercentage}%`);
      doc.moveDown(2);

      // Subject Breakdown Table
      doc.fillColor('#1e293b').fontSize(14).text('Subject Breakdown', { underline: true });
      doc.moveDown(1);

      const subjects = report.reportData?.subjects || [];
      const tableTop = doc.y;
      const col1 = 50, col2 = 250, col3 = 350, col4 = 450;

      // Table Header
      doc.fontSize(10).fillColor('#64748b');
      doc.text('Subject', col1, tableTop);
      doc.text('Obtained', col2, tableTop);
      doc.text('Max', col3, tableTop);
      doc.text('Grade', col4, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#e2e8f0').stroke();

      let currentY = tableTop + 25;
      doc.fillColor('#334155');

      subjects.forEach((s: any) => {
        doc.text(s.subject?.name || 'N/A', col1, currentY);
        doc.text(s.totalObtained.toString(), col2, currentY);
        doc.text(s.totalMax.toString(), col3, currentY);
        doc.text(s.overallGrade, col4, currentY);
        currentY += 20;

        if (currentY > 750) {
          doc.addPage();
          currentY = 50;
        }
      });

      doc.moveDown(2);
      doc.y = currentY + 30;

      // Remarks
      if (report.teacherRemarks) {
        doc.fillColor('#1e293b').fontSize(14).text('Teacher Remarks', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#334155').text(report.teacherRemarks, { width: 500 });
      }

      // Footer
      const pageHeight = doc.page.height;
      doc.fontSize(8).fillColor('#94a3b8').text(
        `Generated on ${new Date().toLocaleDateString()} — School ERP System`,
        50,
        pageHeight - 50,
        { align: 'center', width: 500 }
      );

      doc.end();
    });
  }

  async findByComposite(studentId: string, quarter: string, academicYear: string): Promise<AcademicReportDocument> {
    const report = await this.reportModel.findOne({
      studentId: new Types.ObjectId(studentId),
      quarter: quarter as any,
      academicYear,
    })
      .populate('studentId', 'firstName lastName enrollmentNumber dateOfBirth')
      .populate('classId', 'name grade section academicYear')
      .populate('generatedBy', 'firstName lastName');
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
