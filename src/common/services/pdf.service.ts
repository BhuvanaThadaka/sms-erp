import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);

  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (error) {
      this.logger.error('Error parsing PDF', error);
      return '';
    }
  }
}
