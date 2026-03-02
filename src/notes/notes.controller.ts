import { Controller, Get, Post, Body, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/public.decorator';
import { Role } from '../common/enums';

@Controller('notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() dto: CreateNoteDto, @CurrentUser('userId') userId: string) {
    return this.notesService.create(dto, userId);
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
