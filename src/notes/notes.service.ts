import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto } from './dto/note.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateNoteDto, uploadedBy: string): Promise<NoteDocument> {
    const note = new this.noteModel({
      ...dto,
      uploadedBy: new Types.ObjectId(uploadedBy),
      classId: new Types.ObjectId(dto.classId),
      sessionId: dto.sessionId ? new Types.ObjectId(dto.sessionId) : undefined,
    });
    const saved = await note.save();

    await this.auditLogsService.log({
      action: AuditAction.NOTE_UPLOADED,
      performedBy: uploadedBy,
      entityType: 'Note',
      entityId: saved._id.toString(),
      details: { title: saved.title, classId: dto.classId },
    });

    return saved.populate(['uploadedBy', 'classId']);
  }

  async findByClass(classId: string, subject?: string): Promise<NoteDocument[]> {
    const filter: any = { classId: new Types.ObjectId(classId) };
    if (subject) filter.subject = subject;
    return this.noteModel.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
  }

  async delete(id: string): Promise<{ message: string }> {
    const note = await this.noteModel.findByIdAndDelete(id);
    if (!note) throw new NotFoundException('Note not found');
    return { message: 'Note deleted successfully' };
  }
}
