export interface Exam {
    id: string;
    name: string;
    templateImageUri?: string;
  }
  
  export interface ScanResult {
    examId: string;
    studentName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    scannedAt: Date;
  }