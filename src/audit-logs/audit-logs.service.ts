import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { AuditAction } from '../common/enums';

export interface CreateAuditLogDto {
  action: AuditAction;
  performedBy: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(data: CreateAuditLogDto): Promise<AuditLogDocument> {
    const log = new this.auditLogModel(data);
    return log.save();
  }

  async findAll(filters?: {
    action?: AuditAction;
    performedBy?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }): Promise<AuditLogDocument[]> {
    const query: any = {};
    if (filters?.action) query.action = filters.action;
    if (filters?.performedBy) query.performedBy = filters.performedBy;
    if (filters?.entityType) query.entityType = filters.entityType;
    if (filters?.from || filters?.to) {
      query.timestamp = {};
      if (filters.from) query.timestamp.$gte = new Date(filters.from);
      if (filters.to) query.timestamp.$lte = new Date(filters.to);
    }

    return this.auditLogModel.find(query).sort({ timestamp: -1 }).limit(500).exec();
  }
}
