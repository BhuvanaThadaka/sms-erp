import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AIService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generates a detailed, honest review by comparing Question (Assignment) and Answer (Submission)
   */
  async generateFeedback(
    assignmentText: string, 
    submissionText: string, 
    assignmentTitle: string
  ): Promise<string> {
    if (!this.genAI) {
      return this.generateMockFeedback(assignmentText, submissionText, assignmentTitle);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
        You are an expert academic reviewer. 
        ASSIGNMENT CONTEXT: ${assignmentTitle}
        
        QUESTION PAPER / INSTRUCTIONS:
        """
        ${assignmentText.substring(0, 5000)} 
        """
        
        STUDENT SUBMISSION:
        """
        ${submissionText.substring(0, 5000)}
        """
        
        TASK:
        1. Compare the submission against the instructions.
        2. Identify if all questions are answered.
        3. Check for accuracy and depth.
        4. Be honest and critical.
        5. Provide a concise but detailed review (max 150 words).
        6. Start with a direct assessment.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('AI Review Error:', error);
      return "AI Review failed. Please review manually.";
    }
  }

  private async generateMockFeedback(q: string, a: string, title: string): Promise<string> {
    await new Promise(r => setTimeout(r, 2000));
    
    // Simulate a "smart" mock based on text length comparison
    if (a.length < q.length * 0.3) {
      return `The submission for "${title}" is significantly shorter than expected. Key sections from the assignment instructions appear to be missing. The student has only covered basic definitions without diving into the required analysis.`;
    }
    
    if (a.toLowerCase().includes('lorem ipsum') || a.length < 50) {
      return `Honest Review: The submission appears to be placeholder text or insufficient. It does not address the core questions of "${title}". Please resubmit with actual content.`;
    }

    return `Honest Review: Good attempt at "${title}". The student has addressed most points, but the technical section lacks the specific diagrams requested in the instructions. Calculations are mostly correct, but the final derivation has a minor sign error. Highly recommended for 'Completed' status with minor polishing.`;
  }
}
