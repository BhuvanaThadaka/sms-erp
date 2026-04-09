import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quarter, Grade } from '../../common/enums';

export type MarksDocument = Marks & Document;

@Schema({ timestamps: true })
export class Marks {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subjectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  enteredBy: Types.ObjectId; // subject teacher

  @Prop({ enum: Quarter })
  quarter: Quarter;

  @Prop({ required: true })
  termName: string;

  @Prop({ required: true })
  examCode: string;

  @Prop({ required: true, min: 0 })
  marksObtained: number;

  @Prop({ required: true, min: 1 })
  maxMarks: number;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ enum: Grade })
  grade: Grade;

  @Prop()
  teacherRemarks: string;

  @Prop({ default: false })
  isAbsent: boolean; // if student was absent for exam

  @Prop({ type: Date, default: Date.now })
  enteredAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MarksSchema = SchemaFactory.createForClass(Marks);

// Unique: one mark entry per student per subject per assessment per year
MarksSchema.index(
  { studentId: 1, subjectId: 1, termName: 1, examCode: 1, quarter: 1, academicYear: 1 },
  { unique: true },
);
MarksSchema.index({ classId: 1, termName: 1, examCode: 1, academicYear: 1 });
MarksSchema.index({ subjectId: 1, termName: 1, examCode: 1 });
MarksSchema.index({ studentId: 1, academicYear: 1 });
