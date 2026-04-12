import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AcademicReport, AcademicReportDocument } from './schemas/academic-report.schema';
import { GenerateAcademicReportDto, BulkGenerateReportDto } from './dto/academic-report.dto';
import { MarksService } from '../marks/marks.service';
import { UsersService } from '../users/users.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ClassesService } from '../classes/classes.service';
import { SubjectsService } from '../subjects/subjects.service';
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
    private readonly classesService: ClassesService,
    private readonly subjectsService: SubjectsService,
  ) {}

  async generate(dto: GenerateAcademicReportDto, generatedBy: string): Promise<AcademicReportDocument> {
    if ((dto as any).termName === '') delete dto.termName;
    if ((dto as any).examCode === '') delete dto.examCode;
    if ((dto as any).quarter === '') delete (dto as any).quarter;

    const query: any = {
      studentId: new Types.ObjectId(dto.studentId),
      academicYear: dto.academicYear,
      termName: dto.termName || null,
      examCode: dto.examCode || null,
      quarter: dto.quarter || null,
    };

    const existing = await this.reportModel.findOne(query);
    if (existing) throw new ConflictException('Report already generated for this period. Use update instead.');

    // Fetch report card data from marks service
    const reportCard = await this.marksService.getStudentReportCard(
      dto.studentId, 
      dto.academicYear, 
      dto.classId,
      dto.termName,
      dto.examCode
    );

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
      termName: dto.termName,
      examCode: dto.examCode,
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
          { 
            studentId: student._id.toString(), 
            classId: dto.classId, 
            quarter: (dto as any).quarter === '' ? undefined : dto.quarter, 
            termName: (dto as any).termName === '' ? undefined : dto.termName,
            examCode: (dto as any).examCode === '' ? undefined : dto.examCode,
            academicYear: dto.academicYear 
          },
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
    } else if (filters.requestingUser.role === Role.TEACHER) {
      // Teachers see only reports for classes they are class teacher of
      const classes = await this.classesService.getTeacherClasses(filters.requestingUser.userId, true);
      const classIds = classes.map(c => c._id);
      
      if (filters.classId) {
        if (!classIds.some(id => id.toString() === filters.classId)) {
          return []; // Requested a class they don't lead
        }
        query.classId = new Types.ObjectId(filters.classId);
      } else {
        query.classId = { $in: classIds };
      }

      if (filters.studentId) {
        query.studentId = new Types.ObjectId(filters.studentId);
      }
    } else if (filters.studentId) {
      query.studentId = new Types.ObjectId(filters.studentId);
    }

    const reports = await this.reportModel.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('classId', 'name grade section')
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();

    // Resolve subject names in snapshots for consistent visibility
    for (const report of reports) {
      if (report.reportData?.subjects) {
        for (const s of report.reportData.subjects) {
          if (typeof s.subject === 'string' || (s.subject?._id && !s.subject?.name)) {
            try {
              const subId = typeof s.subject === 'string' ? s.subject : s.subject._id;
              const subObj = await this.subjectsService.findById(subId);
              s.subject = { _id: subId, name: subObj.name, code: subObj.code };
            } catch {}
          }
        }
      }
    }
    
    return reports;
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
    
    // Resolve subject names if they are IDs (for old reports)
    const subjects = report.reportData?.subjects || [];
    for (const s of subjects) {
      if (typeof s.subject === 'string' || (s.subject?._id && !s.subject?.name)) {
        try {
          const subId = typeof s.subject === 'string' ? s.subject : s.subject._id;
          const subObj = await this.subjectsService.findById(subId);
          s.subject = { _id: subId, name: subObj.name, code: subObj.code };
        } catch {}
      }
    }

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // --- COLORS & STYLES ---
      const primaryColor = '#1e3a8a';
      const secondaryColor = '#64748b';
      const borderColor = '#cbd5e1';
      const headerBg = '#f1f5f9';

      // --- PAGE BORDER ---
      doc.rect(20, 20, 555, 782).lineWidth(2).strokeColor(primaryColor).stroke();
      doc.rect(25, 25, 545, 772).lineWidth(0.5).strokeColor(borderColor).stroke();

      // --- HEADER ---
      doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold').text('SCHOOL ERP ACADEMIC SYSTEM', { align: 'center', characterSpacing: 1 });
      doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text('Affiliated to CBSE | School Code: 123456 | academic@schoolerp.com', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(1);

      // Report Title Box
      const reportTitle = report.examCode 
        ? `EXAM REPORT: ${report.examCode}` 
        : report.termName 
          ? `TERM REPORT: ${report.termName}` 
          : 'ANNUAL PROGRESS REPORT';
          
      doc.rect(150, doc.y, 300, 25).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text(reportTitle, 150, doc.y + 6, { width: 300, align: 'center' });
      doc.moveDown(1);
      
      doc.fillColor(primaryColor).fontSize(12).text(`Academic Year: ${report.academicYear}`, { align: 'center' });
      doc.moveDown(1.5);

      // --- STUDENT INFO GRID ---
      const infoY = doc.y;
      doc.fontSize(9).fillColor(secondaryColor).font('Helvetica');
      
      const drawInfo = (label: string, value: string, x: number, y: number) => {
        doc.fillColor(secondaryColor).text(label, x, y);
        doc.fillColor(primaryColor).font('Helvetica-Bold').text(value || 'N/A', x + 85, y);
        doc.font('Helvetica');
      };

      drawInfo('Student Name:', `${report.studentId?.['firstName']} ${report.studentId?.['lastName']}`, 40, infoY);
      drawInfo('Enrollment No:', report.studentId?.['enrollmentNumber'], 40, infoY + 18);
      drawInfo('Date of Birth:', report.studentId?.['dateOfBirth'] ? new Date(report.studentId?.['dateOfBirth']).toLocaleDateString() : 'N/A', 40, infoY + 36);

      drawInfo('Class:', `${report.classId?.['name']} (${report.classId?.['grade']}-${report.classId?.['section']})`, 320, infoY);
      drawInfo('Attendance:', `${report.attendancePercentage}%`, 320, infoY + 18);
      drawInfo('Generated By:', `${report.generatedBy?.['firstName']} ${report.generatedBy?.['lastName']}`, 320, infoY + 36);

      doc.moveDown(4);

      // --- PERFORMANCE TABLE ---
      const tableTop = doc.y;
      
      // Grouping Logic for Column Headers
      const termExamMap: Record<string, string[]> = {};
      subjects.forEach((s: any) => {
        Object.keys(s.quarters || {}).forEach(k => {
          const [term, exam] = k.includes(' - ') ? k.split(' - ') : ['GENERAL', k];
          if (!termExamMap[term]) termExamMap[term] = [];
          if (!termExamMap[term].includes(exam)) termExamMap[term].push(exam);
        });
      });

      const sortedTerms = Object.keys(termExamMap).sort();
      const allExams: { term: string, exam: string, key: string }[] = [];
      sortedTerms.forEach(t => {
        termExamMap[t].sort().forEach(e => {
          allExams.push({ term: t, exam: e, key: t === 'GENERAL' ? e : `${t} - ${e}` });
        });
      });

      const colSubject = 40;
      const colSubjectWidth = 140;
      const colTotal = 460;
      const colTotalWidth = 55;
      const colGrade = 515;
      const colGradeWidth = 40;
      
      const examAreaWidth = colTotal - (colSubject + colSubjectWidth);
      const examColWidth = allExams.length > 0 ? examAreaWidth / allExams.length : 0;

      // Table Header - ROW 1 (Terms)
      doc.rect(colSubject, tableTop, 515, 20).fill(headerBg);
      doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold');
      doc.text('SUBJECT DESCRIPTION', colSubject + 10, tableTop + 6);
      
      let currentX = colSubject + colSubjectWidth;
      sortedTerms.forEach(term => {
        const span = termExamMap[term].length;
        const width = span * examColWidth;
        doc.text(term.toUpperCase(), currentX, tableTop + 6, { width, align: 'center' });
        currentX += width;
      });
      doc.text('TOTAL', colTotal, tableTop + 6, { width: colTotalWidth, align: 'center' });
      doc.text('GRADE', colGrade, tableTop + 6, { width: colGradeWidth, align: 'center' });

      // Table Header - ROW 2 (Exams)
      const subHeaderTop = tableTop + 20;
      doc.rect(colSubject, subHeaderTop, 515, 15).fill('#ffffff');
      doc.fillColor(secondaryColor).fontSize(7);
      
      allExams.forEach((ex, i) => {
        doc.text(ex.exam, colSubject + colSubjectWidth + (i * examColWidth), subHeaderTop + 4, { width: examColWidth, align: 'center' });
      });
      
      doc.moveTo(colSubject, subHeaderTop + 15).lineTo(555, subHeaderTop + 15).strokeColor(primaryColor).lineWidth(1).stroke();

      let currentY = subHeaderTop + 15;

      subjects.forEach((s: any, idx: number) => {
        // Zebra Striping
        if (idx % 2 === 0) {
          doc.rect(colSubject, currentY, 515, 25).fill('#f8fafc');
        }

        doc.fillColor(primaryColor).fontSize(9).font('Helvetica');
        const subjectName = s.subject?.name || s.subject || 'N/A';
        doc.text(subjectName.toString(), colSubject + 10, currentY + 8, { width: colSubjectWidth - 15 });
        
        allExams.forEach((ex, i) => {
          const val = s.quarters?.[ex.key]?.marksObtained ?? '—';
          doc.text(val.toString(), colSubject + colSubjectWidth + (i * examColWidth), currentY + 8, { width: examColWidth, align: 'center' });
        });

        doc.font('Helvetica-Bold').text(`${s.totalObtained}/${s.totalMax}`, colTotal, currentY + 8, { width: colTotalWidth, align: 'center' });
        
        // Grade Color Coding
        const g = s.overallGrade;
        if (g === 'F') doc.fillColor('#ef4444');
        else if (['A', 'A+'].includes(g)) doc.fillColor('#10b981');
        else doc.fillColor(primaryColor);
        
        doc.text(g, colGrade, currentY + 8, { width: colGradeWidth, align: 'center' });
        
        doc.moveTo(colSubject, currentY + 25).lineTo(555, currentY + 25).strokeColor(borderColor).lineWidth(0.5).stroke();
        currentY += 25;

        if (currentY > 650) {
          doc.addPage();
          // Redraw border on new page
          doc.rect(20, 20, 555, 782).lineWidth(2).strokeColor(primaryColor).stroke();
          currentY = 50;
        }
      });

      // --- TOTALS SUMMARY ---
      doc.moveDown(1);
      const summaryY = currentY + 5;
      doc.rect(colSubject, summaryY, 515, 30).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
      doc.text('FINAL PERFORMANCE SUMMARY', colSubject + 10, summaryY + 10);
      
      const summaryValues = `${report.totalObtained} / ${report.totalMax} (${report.percentage}%)`;
      doc.text(summaryValues, colTotal - 100, summaryY + 10, { width: 155, align: 'right' });
      doc.text(report.overallGrade, colGrade, summaryY + 10, { width: colGradeWidth, align: 'center' });
      doc.font('Helvetica');

      // --- GRADE LEGEND ---
      currentY = summaryY + 45;
      doc.fontSize(8).fillColor(secondaryColor).text('GRADE INTERPRETATION:', 40, currentY);
      const legend = 'A+: 90-100% | A: 80-89% | B: 70-79% | C: 60-69% | D: 40-59% | F: <40%';
      doc.text(legend, 40, currentY + 12);

      // --- REMARKS & SIGNATURES ---
      currentY += 40;
      if (report.teacherRemarks) {
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('TEACHER REMARKS:', 40, currentY);
        doc.font('Helvetica-Oblique').fillColor(secondaryColor).text(report.teacherRemarks, 40, currentY + 12, { width: 515 });
        currentY += 50;
      }

      const footerY = 740;
      doc.moveTo(40, footerY).lineTo(160, footerY).strokeColor(primaryColor).lineWidth(1).stroke();
      doc.moveTo(395, footerY).lineTo(555, footerY).stroke();
      
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold');
      doc.text('CLASS TEACHER', 40, footerY + 8, { width: 120, align: 'center' });
      doc.text('PRINCIPAL', 395, footerY + 8, { width: 160, align: 'center' });

      doc.fontSize(7).fillColor(secondaryColor).font('Helvetica');
      doc.text(`Report generated electronically on ${new Date().toLocaleDateString()} | System ID: ${report._id}`, 40, 785, { align: 'center', width: 515 });

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
