import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  grade: string;

  @Prop({ required: true })
  section: string;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  classTeacher: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  teachers: Types.ObjectId[];

  @Prop({ trim: true })
  room: string;

  @Prop({ default: 30 })
  maxStudents: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'AcademicStructure' })
  academicStructure: Types.ObjectId;
}

export const ClassSchema = SchemaFactory.createForClass(Class);
