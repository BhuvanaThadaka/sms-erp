import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AssignmentStatus } from '../../common/enums';

export type AssignmentDocument = Assignment & Document;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  fileUrl: string; // PDF link

  @Prop({ required: true })
  fileName: string;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subjectId: Types.ObjectId;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
