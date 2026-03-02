import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../common/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: Role, default: Role.STUDENT })
  role: Role;

  @Prop({ trim: true })
  phone: string;

  @Prop({ trim: true })
  address: string;

  @Prop()
  avatar: string;

  @Prop({ type: Types.ObjectId, ref: 'Class' })
  classId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  enrollmentNumber: string;

  @Prop()
  employeeId: string;

  @Prop({ type: Date })
  dateOfBirth: Date;

  @Prop({ type: Date })
  joinDate: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});
