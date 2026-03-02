import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacher: Types.ObjectId;

  @Prop({ required: true })
  topic: string;

  @Prop()
  description: string;

  @Prop({ required: true, type: Date })
  sessionDate: Date;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ type: [String], default: [] })
  materials: string[];

  @Prop({ required: true })
  academicYear: string;

  @Prop({ type: [String], default: [] })
  learningObjectives: string[];
}

export const SessionSchema = SchemaFactory.createForClass(Session);
