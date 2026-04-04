import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditAction } from '../../common/enums';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, enum: AuditAction })
  action: AuditAction;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId | string;

  @Prop({ required: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
