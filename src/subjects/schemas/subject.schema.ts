import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  code: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  subjectTeacher: Types.ObjectId;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ default: 100 })
  maxMarks: number;

  @Prop({ default: 40 })
  passingMarks: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
SubjectSchema.index({ classId: 1, code: 1, academicYear: 1 }, { unique: true });
SubjectSchema.index({ subjectTeacher: 1 });
