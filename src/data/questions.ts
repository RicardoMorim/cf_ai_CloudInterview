import { InterviewQuestion, QuestionType, Difficulty } from "../types";

export const TECHNICAL_QUESTIONS: InterviewQuestion[] = [
    {
        questionId: "two-sum",
        type: QuestionType.CODING,
        category: "Array",
        difficulty: Difficulty.EASY,
        title: "Two Sum",
        text: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        tags: ["Array", "Hash Table"],
        estimatedTime: 15,
        followUpQuestions: ["Can you do it in O(n) time?"],
        hints: ["Use a hash map to store the complements."],
        metadata: {
            difficultyWeight: 1,
            popularity: 10,
            lastUpdated: new Date().toISOString(),
            relatedQuestions: []
        }
    },
    {
        questionId: "reverse-linked-list",
        type: QuestionType.CODING,
        category: "LinkedList",
        difficulty: Difficulty.EASY,
        title: "Reverse Linked List",
        text: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        tags: ["LinkedList", "Recursion"],
        estimatedTime: 15,
        followUpQuestions: ["Can you do it iteratively and recursively?"],
        hints: ["Use three pointers: prev, curr, and next."],
        metadata: {
            difficultyWeight: 1,
            popularity: 9,
            lastUpdated: new Date().toISOString(),
            relatedQuestions: []
        }
    },
    {
        questionId: "lru-cache",
        type: QuestionType.CODING,
        category: "Design",
        difficulty: Difficulty.MEDIUM,
        title: "LRU Cache",
        text: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the LRUCache class with `get` and `put` operations.",
        tags: ["Design", "Hash Table", "LinkedList"],
        estimatedTime: 30,
        followUpQuestions: ["What if the cache size is very large?"],
        hints: ["Use a Doubly Linked List combined with a Hash Map."],
        metadata: {
            difficultyWeight: 2,
            popularity: 8,
            lastUpdated: new Date().toISOString(),
            relatedQuestions: []
        }
    }
];

export const BEHAVIORAL_SCENARIOS: InterviewQuestion[] = [
    {
        questionId: "conflict-resolution",
        type: QuestionType.BEHAVIORAL,
        category: "Conflict",
        difficulty: Difficulty.MEDIUM,
        title: "Conflict Resolution",
        text: "Tell me about a time you had a conflict with a coworker. How did you handle it?",
        tags: ["Conflict", "Communication"],
        estimatedTime: 10,
        followUpQuestions: ["What would you do differently now?"],
        hints: ["Use the STAR method."],
        metadata: {
            difficultyWeight: 1,
            popularity: 10,
            lastUpdated: new Date().toISOString(),
            relatedQuestions: []
        }
    }
];
