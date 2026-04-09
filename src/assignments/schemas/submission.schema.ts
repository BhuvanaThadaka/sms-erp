import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SubmissionStatus } from '../../common/enums';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
  assignmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ required: true })
  fileUrl: string; // PDF link of completed work

  @Prop({ required: true })
  fileName: string;

  @Prop({ enum: SubmissionStatus, default: SubmissionStatus.SUBMITTED })
  status: SubmissionStatus;

  @Prop()
  remarks: string;

  @Prop()
  aiFeedback: string;

  @Prop({ type: Date, default: Date.now })
  submittedAt: Date;

  @Prop({ type: Date })
  reviewedAt: Date;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Index for quick lookups
SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
