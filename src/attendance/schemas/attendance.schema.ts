import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AttendanceStatus } from '../../common/enums';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  markedBy: Types.ObjectId;

  @Prop({ required: true, enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ required: true })
  academicYear: string;

  @Prop()
  remarks: string;

  @Prop({ type: Date, default: Date.now })
  markedAt: Date;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

AttendanceSchema.index({ studentId: 1, classId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ classId: 1, date: 1 });
AttendanceSchema.index({ studentId: 1, academicYear: 1 });
