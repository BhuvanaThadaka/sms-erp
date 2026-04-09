import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Marks, MarksDocument } from './schemas/marks.schema';
import { EnterMarksDto, BulkEnterMarksDto, UpdateMarksDto, MarksFilterDto } from './dto/marks.dto';
import { SubjectsService } from '../subjects/subjects.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, Grade, Quarter, Role } from '../common/enums';

@Injectable()
export class MarksService {
  constructor(
    @InjectModel(Marks.name) private marksModel: Model<MarksDocument>,
    private readonly subjectsService: SubjectsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Grade Calculation ──────────────────────────────────
  calculateGrade(percentage: number): Grade {
    if (percentage >= 90) return Grade.A_PLUS;
    if (percentage >= 80) return Grade.A;
    if (percentage >= 70) return Grade.B;
    if (percentage >= 60) return Grade.C;
    if (percentage >= 40) return Grade.D;
    return Grade.F;
  }

  // ─── Enter Single Mark ─────────────────────────────────
  async enterMarks(dto: EnterMarksDto, teacherId: string, teacherRole: string): Promise<MarksDocument> {
    // Verify teacher owns the subject (unless ADMIN)
    if (teacherRole === Role.TEACHER) {
      await this.subjectsService.verifyTeacherOwnsSubject(dto.subjectId, teacherId);
    }

    const percentage = dto.isAbsent ? 0 : (dto.marksObtained / dto.maxMarks) * 100;
    const grade = dto.isAbsent ? Grade.F : this.calculateGrade(percentage);

    const existing = await this.marksModel.findOne({
      studentId: new Types.ObjectId(dto.studentId),
      subjectId: new Types.ObjectId(dto.subjectId),
      termName: dto.termName || null,
      examCode: dto.examCode || null,
      quarter: dto.quarter || null,
      academicYear: dto.academicYear,
    });

    let record: MarksDocument;

    if (existing) {
      existing.marksObtained = dto.marksObtained;
      existing.maxMarks = dto.maxMarks;
      existing.grade = grade;
      existing.teacherRemarks = dto.teacherRemarks;
      existing.isAbsent = dto.isAbsent || false;
      existing.enteredBy = new Types.ObjectId(teacherId) as any;
      existing.updatedAt = new Date();
      record = await existing.save();

      await this.auditLogsService.log({
        action: AuditAction.MARKS_UPDATED,
        performedBy: teacherId,
        entityType: 'Marks',
        entityId: record._id.toString(),
        details: { studentId: dto.studentId, subjectId: dto.subjectId, termName: dto.termName, examCode: dto.examCode },
      });
    } else {
      const newRecord = new this.marksModel({
        ...dto,
        studentId: new Types.ObjectId(dto.studentId),
        subjectId: new Types.ObjectId(dto.subjectId),
        classId: new Types.ObjectId(dto.classId),
        enteredBy: new Types.ObjectId(teacherId),
        grade,
      });
      record = await newRecord.save();

      await this.auditLogsService.log({
        action: AuditAction.MARKS_ENTERED,
        performedBy: teacherId,
        entityType: 'Marks',
        entityId: record._id.toString(),
        details: { studentId: dto.studentId, subjectId: dto.subjectId, termName: dto.termName, examCode: dto.examCode },
      });
    }

    return record.populate([
      { path: 'studentId', select: 'firstName lastName enrollmentNumber' },
      { path: 'subjectId', select: 'name code maxMarks' },
      { path: 'classId', select: 'name grade section' },
    ]);
  }

  // ─── Bulk Enter Marks for a Subject ────────────────────
  async bulkEnterMarks(dto: BulkEnterMarksDto, teacherId: string, teacherRole: string) {
    if (teacherRole === Role.TEACHER) {
      await this.subjectsService.verifyTeacherOwnsSubject(dto.subjectId, teacherId);
    }

    const results = [];
    for (const rec of dto.records) {
      const result = await this.enterMarks(
        {
          studentId: rec.studentId,
          subjectId: dto.subjectId,
          classId: dto.classId,
          quarter: dto.quarter,
          termName: dto.termName,
          examCode: dto.examCode,
          marksObtained: rec.isAbsent ? 0 : rec.marksObtained,
          maxMarks: dto.maxMarks,
          academicYear: dto.academicYear,
          teacherRemarks: rec.teacherRemarks,
          isAbsent: rec.isAbsent || false,
        },
        teacherId,
        teacherRole,
      );
      results.push(result);
    }
    return results;
  }

  // ─── Get Marks ─────────────────────────────────────────
  async getMarks(filter: MarksFilterDto, requestingUser: { userId: string; role: string }): Promise<MarksDocument[]> {
    const query: any = {};

    if (filter.classId) query.classId = new Types.ObjectId(filter.classId);
    if (filter.studentId) query.studentId = new Types.ObjectId(filter.studentId);
    if (filter.subjectId) query.subjectId = new Types.ObjectId(filter.subjectId);
    if (filter.quarter) query.quarter = filter.quarter;
    if (filter.termName) query.termName = filter.termName;
    if (filter.examCode) query.examCode = filter.examCode;
    if (filter.academicYear) query.academicYear = filter.academicYear;

    // Students can only see own marks
    if (requestingUser.role === Role.STUDENT) {
      query.studentId = new Types.ObjectId(requestingUser.userId);
    }

    // Teachers see only their subject marks
    if (requestingUser.role === Role.TEACHER && filter.subjectId) {
      await this.subjectsService.verifyTeacherOwnsSubject(filter.subjectId, requestingUser.userId);
    }

    return this.marksModel.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('subjectId', 'name code maxMarks')
      .populate('classId', 'name grade section')
      .populate('enteredBy', 'firstName lastName')
      .sort({ 'studentId.firstName': 1, quarter: 1 })
      .exec();
  }

  // ─── Student Report Card Data ──────────────────────────
  async getStudentReportCard(studentId: string, academicYear: string, classId?: string) {
    const query: any = {
      studentId: new Types.ObjectId(studentId),
      academicYear,
    };
    if (classId) query.classId = new Types.ObjectId(classId);

    const marks = await this.marksModel.find(query)
      .populate('subjectId', 'name code maxMarks passingMarks')
      .populate({
        path: 'classId',
        select: 'name grade section academicStructure',
        populate: { path: 'academicStructure' },
      })
      .sort({ quarter: 1 });

    // Group by subject
    const subjectMap: Map<string, any> = new Map();
    for (const m of marks) {
      const subId = m.subjectId['_id'].toString();
      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, {
          subject: m.subjectId,
          quarters: {},
          totalObtained: 0,
          totalMax: 0,
        });
      }
      const entry = subjectMap.get(subId);
      const examKey = `${m.termName} - ${m.examCode}`;
      entry.quarters[examKey] = {
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        grade: m.grade,
        isAbsent: m.isAbsent,
        teacherRemarks: m.teacherRemarks,
        termName: m.termName,
        examCode: m.examCode,
      };
      entry.totalObtained += m.marksObtained;
      entry.totalMax += m.maxMarks;
    }

    // Build subject rows
    const subjects = Array.from(subjectMap.values()).map((s) => {
      const percentage = s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0;
      return {
        ...s,
        percentage: Math.round(percentage * 10) / 10,
        overallGrade: this.calculateGrade(percentage),
      };
    });

    // Grand totals
    const grandTotal = subjects.reduce(
      (acc, s) => ({
        obtained: acc.obtained + s.totalObtained,
        max: acc.max + s.totalMax,
      }),
      { obtained: 0, max: 0 },
    );

    const overallPercentage = grandTotal.max > 0
      ? Math.round((grandTotal.obtained / grandTotal.max) * 1000) / 10
      : 0;

    return {
      studentId,
      academicYear,
      subjects,
      grandTotal,
      overallPercentage,
      overallGrade: this.calculateGrade(overallPercentage),
      academicStructure: marks[0]?.classId?.['academicStructure'] || null,
    };
  }

  // ─── Class Performance Overview ────────────────────────
  async getClassPerformance(classId: string, academicYear: string, quarter?: Quarter) {
    const query: any = {
      classId: new Types.ObjectId(classId),
      academicYear,
    };
    if (quarter) query.quarter = quarter;

    const marks = await this.marksModel.find(query)
      .populate('studentId', 'firstName lastName enrollmentNumber')
      .populate('subjectId', 'name code')
      .sort({ 'studentId.firstName': 1 });

    // Group by student
    const studentMap: Map<string, any> = new Map();
    for (const m of marks) {
      const stuId = m.studentId['_id'].toString();
      if (!studentMap.has(stuId)) {
        studentMap.set(stuId, {
          student: m.studentId,
          subjects: {},
          totalObtained: 0,
          totalMax: 0,
        });
      }
      const entry = studentMap.get(stuId);
      const subId = m.subjectId['_id'].toString();
      if (!entry.subjects[subId]) {
        entry.subjects[subId] = { subject: m.subjectId, quarters: {}, exams: {}, total: 0, max: 0 };
      }
      
      const examKey = m.examCode || m.quarter; // Fallback to quarter for legacy data
      entry.subjects[subId].exams[examKey] = m.marksObtained;
      entry.subjects[subId].total += m.marksObtained;
      entry.subjects[subId].max += m.maxMarks;
      entry.totalObtained += m.marksObtained;
      entry.totalMax += m.maxMarks;
    }

    return Array.from(studentMap.values()).map((s) => {
      const pct = s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0;
      return {
        ...s,
        overallPercentage: Math.round(pct * 10) / 10,
        overallGrade: this.calculateGrade(pct),
      };
    });
  }

  async update(id: string, dto: UpdateMarksDto, teacherId: string, role: string): Promise<MarksDocument> {
    const mark = await this.marksModel.findById(id);
    if (!mark) throw new NotFoundException('Marks record not found');

    if (role === Role.TEACHER && mark.enteredBy.toString() !== teacherId) {
      throw new ForbiddenException('You can only update marks you entered');
    }

    if (dto.marksObtained !== undefined) {
      const pct = (dto.marksObtained / mark.maxMarks) * 100;
      mark.grade = this.calculateGrade(pct);
    }
    if (dto.marksObtained !== undefined) mark.marksObtained = dto.marksObtained;
    if (dto.teacherRemarks !== undefined) mark.teacherRemarks = dto.teacherRemarks;
    if (dto.isAbsent !== undefined) mark.isAbsent = dto.isAbsent;
    mark.updatedAt = new Date();

    return mark.save();
  }
}
