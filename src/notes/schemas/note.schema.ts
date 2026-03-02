import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true })
  classId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ required: true })
  fileName: string;

  @Prop()
  fileSize: number;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ type: Types.ObjectId, ref: 'Session' })
  sessionId: Types.ObjectId;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
