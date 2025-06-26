class AlocoAPIHandler {
    constructor() {
        this.apiKey = localStorage.getItem('aloco-api-key') || '';
        this.baseUrl = 'https://questions.aloc.com.ng/api/v2';
        this.isConnected = false;
        this.rateLimitDelay = 1000;
        this.maxRetries = 3;
        this.cache = new Map();
        this.cacheExpiry = 30 * 60 * 1000;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('aloco-api-key', apiKey);
    }

    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/subjects`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.isConnected = true;
                return { success: true, message: 'Connection successful' };
            } else {
                this.isConnected = false;
                const error = await response.json();
                return { success: false, message: error.message || 'Connection failed' };
            }
        } catch (error) {
            this.isConnected = false;
            return { success: false, message: 'Network error: ' + error.message };
        }
    }

    async fetchSubjects() {
        const cacheKey = 'subjects';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.makeRequest('/subjects');
            const data = await response.json();
            
            if (response.ok) {
                this.setCache(cacheKey, data.data);
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch subjects');
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
            return this.getFallbackSubjects();
        }
    }

    async fetchQuestions(config) {
        const { subjects, count, difficulty, year } = config;
        const questionsPerSubject = Math.ceil(count / subjects.length);
        const allQuestions = [];

        for (const subject of subjects) {
            try {
                await this.delay(this.rateLimitDelay);
                const questions = await this.fetchQuestionsBySubject(
                    subject, 
                    questionsPerSubject, 
                    difficulty, 
                    year
                );
                allQuestions.push(...questions);
            } catch (error) {
                console.error(`Error fetching questions for ${subject}:`, error);
                const fallbackQuestions = this.getFallbackQuestions(subject, questionsPerSubject);
                allQuestions.push(...fallbackQuestions);
            }
        }

        return this.shuffleArray(allQuestions).slice(0, count);
    }

    async fetchQuestionsBySubject(subject, count, difficulty, year) {
        const cacheKey = `questions_${subject}_${count}_${difficulty}_${year}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const params = new URLSearchParams({
            subject: subject,
            limit: count.toString(),
            type: 'multiple-choice'
        });

        if (difficulty && difficulty !== 'mixed') {
            params.append('difficulty', difficulty);
        }

        if (year && year !== 'all') {
            params.append('year', year);
        }

        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                const response = await this.makeRequest(`/questions?${params.toString()}`);
                const data = await response.json();

                if (response.ok && data.data) {
                    const processedQuestions = this.processQuestions(data.data, subject);
                    this.setCache(cacheKey, processedQuestions);
                    return processedQuestions;
                } else {
                    throw new Error(data.message || 'Failed to fetch questions');
                }
            } catch (error) {
                retries++;
                if (retries < this.maxRetries) {
                    await this.delay(this.rateLimitDelay * retries);
                } else {
                    throw error;
                }
            }
        }
    }

    processQuestions(rawQuestions, subject) {
        return rawQuestions.map((q, index) => {
            const processedOptions = this.processOptions(q.options || q.choices);
            
            return {
                id: q.id || Date.now() + index,
                subject: this.formatSubjectName(subject),
                text: this.cleanText(q.question || q.text),
                romanOptions: this.generateRomanOptions(processedOptions),
                options: processedOptions.map(opt => opt.text),
                correctAnswer: this.findCorrectAnswer(processedOptions),
                explanation: this.cleanText(q.explanation || q.solution || 'No explanation provided'),
                difficulty: q.difficulty || 'medium',
                year: q.year || new Date().getFullYear(),
                source: 'ALOCO'
            };
        });
    }

    processOptions(options) {
        if (Array.isArray(options)) {
            return options.map((opt, index) => ({
                letter: String.fromCharCode(65 + index),
                text: this.cleanText(typeof opt === 'string' ? opt : opt.text || opt.option),
                isCorrect: typeof opt === 'object' ? (opt.isCorrect || opt.is_correct) : false
            }));
        }
        
        if (typeof options === 'object') {
            return Object.entries(options).map(([key, value]) => ({
                letter: key.toUpperCase(),
                text: this.cleanText(value),
                isCorrect: false
            }));
        }

        return [
            { letter: 'A', text: 'Option A', isCorrect: true },
            { letter: 'B', text: 'Option B', isCorrect: false },
            { letter: 'C', text: 'Option C', isCorrect: false },
            { letter: 'D', text: 'Option D', isCorrect: false }
        ];
    }

    generateRomanOptions(options) {
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        return options.map((opt, index) => 
            `${romanNumerals[index] || (index + 1)}. ${opt.text.substring(0, 50)}${opt.text.length > 50 ? '...' : ''}`
        );
    }

    findCorrectAnswer(options) {
        const correctOption = options.find(opt => opt.isCorrect);
        return correctOption ? correctOption.letter : 'A';
    }

    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }

    formatSubjectName(subject) {
        const subjectMap = {
            'mathematics': 'Mathematics',
            'english': 'English Language',
            'physics': 'Physics',
            'chemistry': 'Chemistry',
            'biology': 'Biology',
            'geography': 'Geography',
            'economics': 'Economics',
            'government': 'Government'
        };
        return subjectMap[subject.toLowerCase()] || subject;
    }

    async makeRequest(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'UTME-Quiz-App/1.0'
            }
        });

        if (response.status === 429) {
            await this.delay(this.rateLimitDelay * 2);
            return this.makeRequest(endpoint);
        }

        return response;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }

    getFallbackSubjects() {
        return [
            { id: 1, name: 'Mathematics', slug: 'mathematics' },
            { id: 2, name: 'English Language', slug: 'english' },
            { id: 3, name: 'Physics', slug: 'physics' },
            { id: 4, name: 'Chemistry', slug: 'chemistry' },
            { id: 5, name: 'Biology', slug: 'biology' },
            { id: 6, name: 'Geography', slug: 'geography' },
            { id: 7, name: 'Economics', slug: 'economics' },
            { id: 8, name: 'Government', slug: 'government' }
        ];
    }

    getFallbackQuestions(subject, count) {
        const fallbackTemplates = {
            mathematics: [
                {
                    text: "If 3x + 5 = 14, find the value of x",
                    options: ["x = 3", "x = 4", "x = 5", "x = 6"],
                    correct: "A"
                },
                {
                    text: "What is 15% of 200?",
                    options: ["25", "30", "35", "40"],
                    correct: "B"
                },
                {
                    text: "Find the area of a rectangle with length 8cm and width 5cm",
                    options: ["30 cm²", "40 cm²", "45 cm²", "50 cm²"],
                    correct: "B"
                },
                {
                    text: "Simplify: 2³ × 2²",
                    options: ["2⁴", "2⁵", "2⁶", "2⁷"],
                    correct: "B"
                }
            ],
            english: [
                {
                    text: "Choose the correct synonym for 'enormous'",
                    options: ["tiny", "huge", "medium", "small"],
                    correct: "B"
                },
                {
                    text: "What is the plural of 'child'?",
                    options: ["childs", "children", "childes", "child"],
                    correct: "B"
                },
                {
                    text: "Identify the verb in: 'The cat runs quickly'",
                    options: ["cat", "runs", "quickly", "the"],
                    correct: "B"
                }
            ],
            physics: [
                {
                    text: "What is the unit of force?",
                    options: ["Joule", "Newton", "Watt", "Pascal"],
                    correct: "B"
                },
                {
                    text: "Which law states that every action has an equal and opposite reaction?",
                    options: ["First law of motion", "Second law of motion", "Third law of motion", "Law of gravitation"],
                    correct: "C"
                },
                {
                    text: "What is the speed of light in vacuum?",
                    options: ["3 × 10⁸ m/s", "3 × 10⁷ m/s", "3 × 10⁹ m/s", "3 × 10⁶ m/s"],
                    correct: "A"
                }
            ],
            chemistry: [
                {
                    text: "What is the chemical symbol for gold?",
                    options: ["Go", "Gd", "Au", "Ag"],
                    correct: "C"
                },
                {
                    text: "How many electrons does a neutral carbon atom have?",
                    options: ["4", "6", "8", "12"],
                    correct: "B"
                },
                {
                    text: "What is the pH of pure water?",
                    options: ["6", "7", "8", "9"],
                    correct: "B"
                }
            ],
            biology: [
                {
                    text: "What is the powerhouse of the cell?",
                    options: ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"],
                    correct: "C"
                },
                {
                    text: "Which blood type is known as the universal donor?",
                    options: ["A", "B", "AB", "O"],
                    correct: "D"
                },
                {
                    text: "What is the main function of red blood cells?",
                    options: ["Fight infection", "Transport oxygen", "Clot blood", "Produce hormones"],
                    correct: "B"
                }
            ],
            geography: [
                {
                    text: "What is the capital of Nigeria?",
                    options: ["Lagos", "Abuja", "Kano", "Port Harcourt"],
                    correct: "B"
                },
                {
                    text: "Which is the longest river in the world?",
                    options: ["Amazon", "Nile", "Mississippi", "Yangtze"],
                    correct: "B"
                },
                {
                    text: "What causes seasons on Earth?",
                    options: ["Distance from sun", "Tilt of Earth's axis", "Solar flares", "Moon phases"],
                    correct: "B"
                }
            ],
            economics: [
                {
                    text: "What does GDP stand for?",
                    options: ["Gross Domestic Product", "General Development Plan", "Global Data Processing", "Great Depression Period"],
                    correct: "A"
                },
                {
                    text: "What is inflation?",
                    options: ["Decrease in prices", "Increase in prices", "Stable prices", "No prices"],
                    correct: "B"
                },
                {
                    text: "What is the law of demand?",
                    options: ["Price up, demand up", "Price down, demand down", "Price up, demand down", "Price stable, demand up"],
                    correct: "C"
                }
            ],
            government: [
                {
                    text: "What type of government does Nigeria practice?",
                    options: ["Parliamentary", "Presidential", "Monarchy", "Theocracy"],
                    correct: "B"
                },
                {
                    text: "How many arms of government are there?",
                    options: ["2", "3", "4", "5"],
                    correct: "B"
                },
                {
                    text: "What is the highest court in Nigeria?",
                    options: ["High Court", "Court of Appeal", "Supreme Court", "Federal High Court"],
                    correct: "C"
                }
            ]
        };

        const templates = fallbackTemplates[subject.toLowerCase()] || fallbackTemplates.mathematics;
        const questions = [];
        
        for (let i = 0; i < count; i++) {
            const template = templates[i % templates.length];
            const options = template.options.map((opt, index) => ({
                letter: String.fromCharCode(65 + index),
                text: opt,
                isCorrect: String.fromCharCode(65 + index) === template.correct
            }));

            questions.push({
                id: Date.now() + i,
                subject: this.formatSubjectName(subject),
                text: template.text,
                romanOptions: this.generateRomanOptions(options),
                options: template.options,
                correctAnswer: template.correct,
                explanation: "This is a sample question for practice purposes.",
                difficulty: "medium",
                year: new Date().getFullYear(),
                source: "Fallback"
            });
        }

        return questions;
    }
}
