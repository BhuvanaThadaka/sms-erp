import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, CreateSubmissionDto, ReviewSubmissionDto } from './dto/assignment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';
import { existsSync } from 'fs';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/assignments',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf)$/)) {
          return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadFile(@UploadedFile() file: any) {
    return {
      fileName: file.filename,
      originalName: file.originalname,
      url: `/api/v1/assignments/download/${file.filename}`,
    };
  }

  @Public()
  @Get('download/:filename')
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'assignments', filename);
    if (!existsSync(filePath)) {
      // Minimal valid blank PDF buffer as fallback
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      const minimalPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
      );
      return res.send(minimalPdf);
    }
    return res.sendFile(filePath);
  }

  // --- Teacher Endpoints ---

  @Post()
  @Roles(Role.TEACHER)
  createAssignment(@Body() dto: CreateAssignmentDto, @CurrentUser('userId') teacherId: string) {
    return this.assignmentsService.createAssignment(dto, teacherId);
  }

  @Get('teacher')
  @Roles(Role.TEACHER)
  getTeacherAssignments(@CurrentUser('userId') teacherId: string) {
    return this.assignmentsService.getTeacherAssignments(teacherId);
  }

  @Get(':id/submissions')
  @Roles(Role.TEACHER)
  getSubmissions(@Param('id') assignmentId: string) {
    return this.assignmentsService.getSubmissionsForAssignment(assignmentId);
  }

  @Patch('submissions/:id/review')
  @Roles(Role.TEACHER)
  reviewSubmission(@Param('id') submissionId: string, @Body() dto: ReviewSubmissionDto) {
    return this.assignmentsService.reviewSubmission(submissionId, dto);
  }

  @Post('submissions/:id/ai-review')
  @Roles(Role.TEACHER)
  runAIReview(@Param('id') submissionId: string) {
    return this.assignmentsService.runAIReview(submissionId);
  }

  // --- Student Endpoints ---

  @Get('class/:classId')
  @Roles(Role.STUDENT, Role.TEACHER)
  getAssignmentsByClass(@Param('classId') classId: string) {
    return this.assignmentsService.getAssignmentsByClass(classId);
  }

  @Post('submit')
  @Roles(Role.STUDENT)
  submitAssignment(@Body() dto: CreateSubmissionDto, @CurrentUser('userId') studentId: string) {
    return this.assignmentsService.submitAssignment(studentId, dto);
  }

  @Get('student/my-submissions')
  @Roles(Role.STUDENT)
  getStudentSubmissions(@CurrentUser('userId') studentId: string) {
    return this.assignmentsService.getStudentSubmissions(studentId);
  }
}
