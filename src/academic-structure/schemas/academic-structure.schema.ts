import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AcademicStructureDocument = AcademicStructure & Document;

@Schema()
class Exam {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, default: 100 })
  maxMarks: number;

  @Prop({ default: 0 })
  weightage: number;
}

const ExamSchema = SchemaFactory.createForClass(Exam);

@Schema()
class Term {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [ExamSchema], default: [] })
  exams: Exam[];
}

const TermSchema = SchemaFactory.createForClass(Term);

@Schema({ timestamps: true })
export class AcademicStructure {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [TermSchema], default: [] })
  terms: Term[];

  @Prop({ default: true })
  isActive: boolean;
}

export const AcademicStructureSchema = SchemaFactory.createForClass(AcademicStructure);
