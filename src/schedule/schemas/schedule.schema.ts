import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScheduleDocument = Schedule & Document;

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Schema({ timestamps: true })
export class Schedule {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacher: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true, enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Prop({ required: true })
  startTime: string; // HH:mm

  @Prop({ required: true })
  endTime: string;

  @Prop()
  room: string;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  rescheduledDate: Date;

  @Prop()
  rescheduleReason: string;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
