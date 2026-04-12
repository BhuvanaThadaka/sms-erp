import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { existsSync, mkdirSync } from 'fs';

@Controller('notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const path = './uploads/notes';
          if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
          }
          cb(null, path);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  uploadFile(@UploadedFile() file: any) {
    return {
      fileName: file.filename,
      originalName: file.originalname,
      url: `/api/v1/notes/download/${file.filename}`,
      size: file.size,
    };
  }

  @Public()
  @Get('download/:filename')
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', 'notes', filename);
    if (!existsSync(filePath)) {
      return res.status(404).send('File not found');
    }
    return res.sendFile(filePath);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateNoteDto, @CurrentUser('userId') userId: string) {
    return this.notesService.create(dto, userId);
  }

  @Get('my-notes')
  @Roles(Role.TEACHER)
  getMyNotes(@CurrentUser('userId') userId: string) {
    return this.notesService.findByTeacher(userId);
  }

  @Get('class/:classId')
  findByClass(@Param('classId') classId: string, @Query('subject') subject?: string) {
    return this.notesService.findByClass(classId, subject);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  delete(@Param('id') id: string) {
    return this.notesService.delete(id);
  }
}
