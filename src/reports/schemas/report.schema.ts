import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Quarter } from '../../common/enums';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
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

  @Prop({ required: true })
  attendancePercentage: number;

  @Prop({ required: true })
  totalDays: number;

  @Prop({ required: true })
  presentDays: number;

  @Prop({ required: true })
  absentDays: number;

  @Prop({ required: true })
  lateDays: number;

  @Prop()
  teacherRemarks: string;

  @Prop()
  participationSummary: string;

  @Prop()
  overallPerformance: string; // EXCELLENT, GOOD, AVERAGE, BELOW_AVERAGE

  @Prop()
  pdfUrl: string;

  @Prop({ type: Date, default: Date.now })
  generatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index({ studentId: 1, quarter: 1, academicYear: 1 }, { unique: true });
