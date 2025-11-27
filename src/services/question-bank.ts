// Question Bank Service for CloudInterview

import {
  InterviewQuestion,
  CodingChallenge,
  QuestionSearchParams,
  QuestionType,
  Difficulty
} from "../types";
import { QuestionRepository, KVService } from "./interfaces";

export class QuestionBankService implements QuestionRepository {
  private kv: KVService;
  private readonly QUESTION_PREFIX = "question:";
  private readonly CHALLENGE_PREFIX = "challenge:";
  private readonly INDEX_PREFIX = "index:";
  private readonly METADATA_KEY = "metadata";

  constructor(kv: KVService) {
    this.kv = kv;
  }

  // Save a question to KV
  async save(question: InterviewQuestion): Promise<void> {
    const key = `${this.QUESTION_PREFIX}${question.questionId}`;
    await this.kv.put(key, question);
    
    // Update indices
    await this.updateIndices(question);
  }

  // Save a coding challenge to KV
  async saveChallenge(challenge: CodingChallenge): Promise<void> {
    const key = `${this.CHALLENGE_PREFIX}${challenge.questionId}`;
    await this.kv.put(key, challenge);
    
    // Also save as regular question for general searches
    const question: InterviewQuestion = {
      questionId: challenge.questionId,
      type: challenge.type,
      category: challenge.category,
      difficulty: challenge.difficulty,
      title: challenge.title,
      text: challenge.text,
      tags: challenge.tags,
      estimatedTime: challenge.estimatedTime,
      followUpQuestions: challenge.followUpQuestions,
      hints: challenge.hints,
      metadata: challenge.metadata
    };
    
    await this.save(question);
    await this.updateIndices(question);
  }

  // Find question by ID
  async findById(questionId: string): Promise<InterviewQuestion | null> {
    const key = `${this.QUESTION_PREFIX}${questionId}`;
    return await this.kv.get<InterviewQuestion>(key);
  }

  // Find coding challenge by ID
  async findChallengeById(challengeId: string): Promise<CodingChallenge | null> {
    const key = `${this.CHALLENGE_PREFIX}${challengeId}`;
    return await this.kv.get<CodingChallenge>(key);
  }

  // Find questions by criteria
  async findByCriteria(criteria: QuestionSearchParams): Promise<InterviewQuestion[]> {
    const allQuestions = await this.getAllQuestions();
    
    let filtered = allQuestions.filter(question => {
      // Filter by type
      if (criteria.type && question.type !== criteria.type) {
        return false;
      }
      
      // Filter by difficulty
      if (criteria.difficulty && question.difficulty !== criteria.difficulty) {
        return false;
      }
      
      // Filter by category
      if (criteria.category && question.category !== criteria.category) {
        return false;
      }
      
      // Filter by topics (for coding challenges, check if question tags include any of the requested topics)
      if (criteria.topics) {
        const topics = Array.isArray(criteria.topics) ? criteria.topics : [criteria.topics];
        const hasMatchingTopic = topics.some(topic => 
          question.tags.some(tag => tag.toLowerCase().includes(topic.toLowerCase()))
        );
        if (!hasMatchingTopic) {
          return false;
        }
      }
      
      return true;
    });

    // Apply pagination
    const limit = criteria.limit || 20;
    const offset = criteria.offset || 0;
    return filtered.slice(offset, offset + limit);
  }

  // Get random questions
  async findRandom(count: number, difficulty?: string, type?: string): Promise<InterviewQuestion[]> {
    const allQuestions = await this.getAllQuestions();
    
    let filtered = allQuestions;
    
    // Apply filters if specified
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }
    
    if (type) {
      filtered = filtered.filter(q => q.type === type);
    }
    
    // Shuffle array and take requested count
    const shuffled = this.shuffleArray(filtered);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Delete question
  async delete(questionId: string): Promise<void> {
    const questionKey = `${this.QUESTION_PREFIX}${questionId}`;
    const challengeKey = `${this.CHALLENGE_PREFIX}${questionId}`;
    
    await this.kv.delete(questionKey);
    await this.kv.delete(challengeKey);
    
    // Update indices
    await this.removeFromIndices(questionId);
  }

  // Update question
  async update(question: InterviewQuestion): Promise<void> {
    await this.save(question);
  }

  // Get count of questions matching criteria
  async getCount(filters?: Partial<QuestionSearchParams>): Promise<number> {
    const allQuestions = await this.getAllQuestions();
    
    let filtered = allQuestions;
    
    if (filters) {
      filtered = allQuestions.filter(question => {
        if (filters.type && question.type !== filters.type) {
          return false;
        }
        if (filters.difficulty && question.difficulty !== filters.difficulty) {
          return false;
        }
        if (filters.category && question.category !== filters.category) {
          return false;
        }
        return true;
      });
    }
    
    return filtered.length;
  }

  // Get all questions (for internal use)
  private async getAllQuestions(): Promise<InterviewQuestion[]> {
    const metadata = await this.getMetadata();
    const questionIds = metadata.questionIds || [];
    
    const questions: InterviewQuestion[] = [];
    
    for (const questionId of questionIds) {
      const question = await this.findById(questionId);
      if (question) {
        questions.push(question);
      }
    }
    
    return questions;
  }

  // Get questions by difficulty
  async findByDifficulty(difficulty: Difficulty): Promise<InterviewQuestion[]> {
    return this.findByCriteria({ difficulty });
  }

  // Get questions by category
  async findByCategory(category: string): Promise<InterviewQuestion[]> {
    return this.findByCriteria({ category });
  }

  // Get questions by topic
  async findByTopic(topic: string): Promise<InterviewQuestion[]> {
    return this.findByCriteria({ topics: [topic] });
  }

  // Search questions by text
  async searchByText(query: string): Promise<InterviewQuestion[]> {
    const allQuestions = await this.getAllQuestions();
    
    const lowerQuery = query.toLowerCase();
    return allQuestions.filter(question => 
      question.title.toLowerCase().includes(lowerQuery) ||
      question.text.toLowerCase().includes(lowerQuery) ||
      question.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Get available filters
  async getAvailableFilters(): Promise<{
    types: QuestionType[];
    difficulties: Difficulty[];
    categories: string[];
    topics: string[];
  }> {
    const allQuestions = await this.getAllQuestions();
    
    const types = [...new Set(allQuestions.map(q => q.type))];
    const difficulties = [...new Set(allQuestions.map(q => q.difficulty))];
    const categories = [...new Set(allQuestions.map(q => q.category))];
    const topics = [...new Set(allQuestions.flatMap(q => q.tags))];
    
    return {
      types: types as QuestionType[],
      difficulties: difficulties as Difficulty[],
      categories,
      topics
    };
  }

  // Bulk upload questions
  async bulkUpload(questions: InterviewQuestion[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const question of questions) {
      try {
        await this.save(question);
        success++;
      } catch (error) {
        failed++;
        errors.push(`Failed to upload question ${question.questionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  // Get question statistics
  async getQuestionStats(): Promise<{
    totalQuestions: number;
    byType: Record<QuestionType, number>;
    byDifficulty: Record<Difficulty, number>;
    byCategory: Record<string, number>;
    averageDifficulty: number;
  }> {
    const allQuestions = await this.getAllQuestions();
    
    const byType: Record<QuestionType, number> = {} as Record<QuestionType, number>;
    const byDifficulty: Record<Difficulty, number> = {} as Record<Difficulty, number>;
    const byCategory: Record<string, number> = {};
    
    let totalDifficulty = 0;
    
    for (const question of allQuestions) {
      // Count by type
      byType[question.type] = (byType[question.type] || 0) + 1;
      
      // Count by difficulty
      byDifficulty[question.difficulty] = (byDifficulty[question.difficulty] || 0) + 1;
      totalDifficulty += this.difficultyToNumber(question.difficulty);
      
      // Count by category
      byCategory[question.category] = (byCategory[question.category] || 0) + 1;
    }
    
    return {
      totalQuestions: allQuestions.length,
      byType,
      byDifficulty,
      byCategory,
      averageDifficulty: allQuestions.length > 0 ? totalDifficulty / allQuestions.length : 0
    };
  }

  // Get question with more context (including related questions)
  async getQuestionWithContext(questionId: string): Promise<{
    question: InterviewQuestion;
    relatedQuestions: InterviewQuestion[];
    similarByTags: InterviewQuestion[];
  } | null> {
    const question = await this.findById(questionId);
    if (!question) {
      return null;
    }
    
    // Get related questions from metadata
    const relatedQuestions = [];
    if (question.metadata.relatedQuestions) {
      for (const relatedId of question.metadata.relatedQuestions) {
        const related = await this.findById(relatedId);
        if (related) {
          relatedQuestions.push(related);
        }
      }
    }
    
    // Get similar questions by tags
    const similarByTags = await this.getAllQuestions().then(questions =>
      questions
        .filter(q => q.questionId !== questionId && 
               q.tags.some(tag => question.tags.includes(tag)))
        .slice(0, 5)
    );
    
    return {
      question,
      relatedQuestions,
      similarByTags
    };
  }

  // Private helper methods

  private async updateIndices(question: InterviewQuestion): Promise<void> {
    const metadata = await this.getMetadata();
    
    // Add to question IDs list
    if (!metadata.questionIds) {
      metadata.questionIds = [];
    }
    if (!metadata.questionIds.includes(question.questionId)) {
      metadata.questionIds.push(question.questionId);
    }
    
    // Update type indices
    if (!metadata.byType) {
      metadata.byType = {};
    }
    if (!metadata.byType[question.type]) {
      metadata.byType[question.type] = [];
    }
    if (!metadata.byType[question.type].includes(question.questionId)) {
      metadata.byType[question.type].push(question.questionId);
    }
    
    // Update difficulty indices
    if (!metadata.byDifficulty) {
      metadata.byDifficulty = {};
    }
    if (!metadata.byDifficulty[question.difficulty]) {
      metadata.byDifficulty[question.difficulty] = [];
    }
    if (!metadata.byDifficulty[question.difficulty].includes(question.questionId)) {
      metadata.byDifficulty[question.difficulty].push(question.questionId);
    }
    
    await this.kv.put(this.METADATA_KEY, metadata);
  }

  private async removeFromIndices(questionId: string): Promise<void> {
    const metadata = await this.getMetadata();
    
    if (metadata.questionIds) {
      metadata.questionIds = metadata.questionIds.filter(id => id !== questionId);
    }
    
    if (metadata.byType) {
      Object.keys(metadata.byType).forEach(type => {
        metadata.byType[type] = metadata.byType[type].filter(id => id !== questionId);
      });
    }
    
    if (metadata.byDifficulty) {
      Object.keys(metadata.byDifficulty).forEach(difficulty => {
        metadata.byDifficulty[difficulty] = metadata.byDifficulty[difficulty].filter(id => id !== questionId);
      });
    }
    
    await this.kv.put(this.METADATA_KEY, metadata);
  }

  private async getMetadata(): Promise<{
    questionIds?: string[];
    byType?: Record<string, string[]>;
    byDifficulty?: Record<string, string[]>;
  }> {
    const metadata = await this.kv.get(this.METADATA_KEY);
    return metadata || {};
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private difficultyToNumber(difficulty: Difficulty): number {
    switch (difficulty) {
      case Difficulty.EASY: return 1;
      case Difficulty.MEDIUM: return 2;
      case Difficulty.HARD: return 3;
      case Difficulty.EXPERT: return 4;
      default: return 0;
    }
  }
}