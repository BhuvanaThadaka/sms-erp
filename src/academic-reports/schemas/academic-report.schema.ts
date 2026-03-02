import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quarter, Grade } from '../../common/enums';

export type AcademicReportDocument = AcademicReport & Document;

@Schema({ timestamps: true })
export class AcademicReport {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  generatedBy: Types.ObjectId;

  @Prop({ required: true, enum: Quarter })
  quarter: Quarter;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ type: Object }) // full report data snapshot
  reportData: any;

  @Prop({ default: 0 })
  totalObtained: number;

  @Prop({ default: 0 })
  totalMax: number;

  @Prop({ default: 0 })
  percentage: number;

  @Prop({ enum: Grade })
  overallGrade: Grade;

  @Prop() // attendance summary from the existing module
  attendancePercentage: number;

  @Prop()
  teacherRemarks: string;

  @Prop()
  pdfUrl: string;
}

export const AcademicReportSchema = SchemaFactory.createForClass(AcademicReport);
AcademicReportSchema.index({ studentId: 1, quarter: 1, academicYear: 1 }, { unique: true });
AcademicReportSchema.index({ classId: 1, quarter: 1, academicYear: 1 });
