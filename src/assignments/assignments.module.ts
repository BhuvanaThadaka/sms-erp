import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AIService } from './ai.service';
import { PDFService } from '../common/services/pdf.service';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    SubjectsModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AIService, PDFService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
