import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';

// Load environment variables
config();

// Validate API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
    process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface QuestionResponse {
    question: string;
    options: string[];
    correctAnswer: string;
}

export async function generateRoleQuestion(roleName: string, category: string): Promise<QuestionResponse> {
    try {
        const prompt = `You are a role verification system. Generate a verification question for a Discord role named "${roleName}" in the category "${category}".

Return a JSON object with this exact structure, no markdown formatting, no code blocks, just the raw JSON:
{
    "question": "A relevant question to verify if the user belongs to this role",
    "options": ["4 different options, one of which is correct"],
    "correctAnswer": "The correct option from the options array"
}

Guidelines:
- For a developer role, ask about programming concepts
- For a gaming role, ask about gaming platforms or popular games
- For a movie role, ask about film genres or directors
- For an alumni role, ask about specific university details

Important: Return ONLY the raw JSON object, no markdown, no code blocks, no additional text.`;

        const response = await genAI.models.generateContent({
            model:'gemini-2.0-flash',
            contents:prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        question: { type: 'string' },
                        options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
                        correctAnswer: { type: 'string' }
                    },
                    required: ['question', 'options', 'correctAnswer']
                }
            }
        });
        const text = response.text;

        if(!text) throw new Error('response is empty')
        
        // Clean the response text
        const cleanedText = text
            .replace(/```json\s*/g, '') // Remove ```json
            .replace(/```\s*/g, '')     // Remove ```
            .trim();                    // Remove extra whitespace
        
        // Parse the JSON response
        const questionData = JSON.parse(cleanedText) as QuestionResponse;
        
        // Validate the response structure
        if (!questionData.question || !Array.isArray(questionData.options) || !questionData.correctAnswer) {
            throw new Error('Invalid response structure from Gemini');
        }

        return questionData;
    } catch (error) {
        console.error('Error generating question with Gemini:', error);
        // Fallback to default questions if Gemini fails
        return getDefaultQuestion(roleName, category);
    }
}

function getDefaultQuestion(roleName: string, category: string): QuestionResponse {
    const defaultQuestions: Record<string, QuestionResponse> = {
        '🧠 Logic Lords': {
            question: 'What is the time complexity of binary search?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
            correctAnswer: 'O(log n)'
        },
        '👾 Game On': {
            question: 'Which gaming platform do you primarily use?',
            options: ['PC', 'PlayStation', 'Xbox', 'Nintendo'],
            correctAnswer: 'PC'
        },
        '📽️ Cinephile': {
            question: 'What is your favorite movie genre?',
            options: ['Action', 'Comedy', 'Drama', 'Sci-Fi'],
            correctAnswer: 'Drama'
        },
        '💼 Parul Alumni': {
            question: 'What is the fare of chhagda from waghodia chowkdi to parul university?',
            options: ['Rs. 20', 'Rs. 25', 'Rs. 30', 'Rs. 35'],
            correctAnswer: 'Rs. 30'
        }
    };

    return defaultQuestions[roleName] || {
        question: 'Are you sure you want this role?',
        options: ['Yes', 'No', 'Maybe', 'Not sure'],
        correctAnswer: 'Yes'
    };
} 