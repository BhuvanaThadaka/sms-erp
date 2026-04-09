import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { CreateAssignmentDto, CreateSubmissionDto, ReviewSubmissionDto } from './dto/assignment.dto';
import { AIService } from './ai.service';
import { PDFService } from '../common/services/pdf.service';
import { SubjectsService } from '../subjects/subjects.service';
import { SubmissionStatus, AssignmentStatus } from '../common/enums';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    private readonly aiService: AIService,
    private readonly pdfService: PDFService,
    private readonly subjectsService: SubjectsService,
  ) {}

  // Assignment methods
  async createAssignment(dto: CreateAssignmentDto, teacherId: string): Promise<AssignmentDocument> {
    const subject = await this.subjectsService.findById(dto.subjectId);
    if (!subject) throw new NotFoundException('Subject not found');
    
    if (subject.subjectTeacher['_id'].toString() !== teacherId) {
      throw new ForbiddenException('You are not the assigned teacher for this subject');
    }

    if (subject.classId['_id'].toString() !== dto.classId) {
      throw new BadRequestException('This subject does not belong to the selected class');
    }

    const assignment = new this.assignmentModel({
      ...dto,
      teacherId: new Types.ObjectId(teacherId),
      classId: new Types.ObjectId(dto.classId),
      subjectId: new Types.ObjectId(dto.subjectId),
    });
    return (await assignment.save()).populate(['classId', 'subjectId']);
  }

  async getAssignmentsByClass(classId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ classId: new Types.ObjectId(classId), status: { $ne: AssignmentStatus.DRAFT } })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getTeacherAssignments(teacherId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ teacherId: new Types.ObjectId(teacherId) })
      .populate('classId', 'name grade section')
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Submission methods
  async submitAssignment(studentId: string, dto: CreateSubmissionDto): Promise<SubmissionDocument> {
    const existing = await this.submissionModel.findOne({
      assignmentId: new Types.ObjectId(dto.assignmentId),
      studentId: new Types.ObjectId(studentId),
    });

    if (existing) {
      existing.fileUrl = dto.fileUrl;
      existing.fileName = dto.fileName;
      existing.status = SubmissionStatus.SUBMITTED;
      existing.submittedAt = new Date();
      return existing.save();
    }

    const submission = new this.submissionModel({
      ...dto,
      assignmentId: new Types.ObjectId(dto.assignmentId),
      studentId: new Types.ObjectId(studentId),
    });

    return submission.save();
  }

  async getSubmissionsForAssignment(assignmentId: string): Promise<SubmissionDocument[]> {
    return this.submissionModel
      .find({ assignmentId: new Types.ObjectId(assignmentId) })
      .populate('studentId', 'firstName lastName rollNumber')
      .sort({ submittedAt: -1 })
      .exec();
  }

  async getStudentSubmissions(studentId: string): Promise<SubmissionDocument[]> {
    return this.submissionModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .populate({
        path: 'assignmentId',
        populate: { path: 'subjectId', select: 'name code' }
      })
      .exec();
  }

  async reviewSubmission(submissionId: string, dto: ReviewSubmissionDto): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) throw new NotFoundException('Submission not found');

    submission.status = dto.status;
    submission.remarks = dto.remarks;
    submission.reviewedAt = new Date();

    return submission.save();
  }

  async runAIReview(submissionId: string): Promise<SubmissionDocument> {
    const submission = await this.submissionModel.findById(submissionId).populate('assignmentId');
    if (!submission) throw new NotFoundException('Submission not found');

    const assignment = submission.assignmentId as any;

    // 1. Attempt to read and extract text from PDFs
    let assignmentText = assignment.description || 'Reference assignment instructions';
    let submissionText = `Submission file: ${submission.fileName}`;

    try {
      const assignmentBuffer = await this.getFileBuffer(assignment.fileName);
      const submissionBuffer = await this.getFileBuffer(submission.fileName);

      const qText = await this.pdfService.extractText(assignmentBuffer);
      const aText = await this.pdfService.extractText(submissionBuffer);

      if (qText) assignmentText = qText;
      if (aText) submissionText = aText;
    } catch (e) {
      this.logger.warn(`Could not extract PDF text for submission ${submissionId}, using metadata fallback`, e);
    }

    // 2. Call AI Service with extracted text
    const aiFeedback = await this.aiService.generateFeedback(assignmentText, submissionText, assignment.title);
    
    submission.aiFeedback = aiFeedback;
    return submission.save();
  }

  private async getFileBuffer(filename: string): Promise<Buffer> {
    const filePath = path.join(process.cwd(), 'uploads', 'assignments', filename);
    if (existsSync(filePath)) {
      return fs.readFile(filePath);
    }
    return Buffer.from("%PDF-1.4 Simulated PDF Content for " + filename);
  }
}
