// Core Application Logic
class QuizApp {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.currentQuestion = 0;
        this.userAnswers = {};
        this.bookmarkedQuestions = new Set();
        this.timeRemaining = 0;
        this.timer = null;
        this.isAuthenticated = false;
        
        this.init();
    }

    init() {
        this.hideLoadingScreen();
        this.setupEventListeners();
        this.setupThemeToggle();
        this.checkAuthState();
    }

    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1500);
    }

    setupEventListeners() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });

        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo(e.target.dataset.page);
            });
        });

        // Dashboard actions
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => this.handleDashboardAction(e.currentTarget.dataset.action));
        });

        // Quiz controls
        document.getElementById('prev-btn')?.addEventListener('click', () => this.previousQuestion());
        document.getElementById('next-btn')?.addEventListener('click', () => this.nextQuestion());
        document.getElementById('submit-quiz-btn')?.addEventListener('click', () => this.submitQuiz());
        document.getElementById('review-btn')?.addEventListener('click', () => this.showReviewModal());
        document.getElementById('bookmark-btn')?.addEventListener('click', () => this.toggleBookmark());

        // Options selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('option')) {
                this.selectOption(e.target);
            }
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Results actions
        document.getElementById('retake-btn')?.addEventListener('click', () => this.retakeQuiz());
        document.getElementById('back-dashboard-btn')?.addEventListener('click', () => this.navigateTo('dashboard'));

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());

        // Settings FAB
        document.getElementById('settings-fab')?.addEventListener('click', () => this.showSettingsModal());

        // Mobile navigation
        document.getElementById('nav-toggle')?.addEventListener('click', () => this.toggleMobileNav());
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.checked = currentTheme === 'dark';

        themeToggle.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    checkAuthState() {
        const user = localStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
            this.showMainContent();
        } else {
            this.showAuthContainer();
        }
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            // Simulate login (replace with actual API call)
            const user = {
                id: Date.now(),
                name: email.split('@')[0],
                email: email,
                avatar: 'https://via.placeholder.com/120',
                stats: {
                    quizzesTaken: 0,
                    averageScore: 0,
                    bestScore: 0,
                    globalRank: 0
                }
            };

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.showMainContent();
            this.showToast('Login successful!', 'success');
        } catch (error) {
            this.showToast('Login failed. Please try again.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match!', 'error');
            return;
        }

        try {
            // Simulate signup (replace with actual API call)
            const user = {
                id: Date.now(),
                name: name,
                email: email,
                avatar: 'https://via.placeholder.com/120',
                stats: {
                    quizzesTaken: 0,
                    averageScore: 0,
                    bestScore: 0,
                    globalRank: 0
                }
            };

            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.showMainContent();
            this.showToast('Account created successfully!', 'success');
        } catch (error) {
            this.showToast('Signup failed. Please try again.', 'error');
        }
    }

    showAuthContainer() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('show');
        document.getElementById('navbar').classList.remove('show');
    }

    showMainContent() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-content').classList.add('show');
        document.getElementById('navbar').classList.add('show');
        this.updateUserInfo();
        this.navigateTo('dashboard');
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        document.getElementById('user-name').textContent = this.currentUser.name;
        document.getElementById('dashboard-name').textContent = this.currentUser.name;
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        
        // Update stats
        const stats = this.currentUser.stats;
        document.getElementById('total-quizzes').textContent = stats.quizzesTaken;
        document.getElementById('avg-score').textContent = `${stats.averageScore}%`;
        document.getElementById('best-score').textContent = `${stats.bestScore}%`;
        document.getElementById('user-rank').textContent = `#${stats.globalRank || 'N/A'}`;
    }

    navigateTo(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Show page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');

        // Close mobile nav
        document.getElementById('nav-menu').classList.remove('active');
    }

    handleDashboardAction(action) {
        switch (action) {
            case 'start-quiz':
                this.startQuiz();
                break;
            case 'view-history':
                this.showQuizHistory();
                break;
            default:
                break;
        }
    }

    async startQuiz() {
        try {
            // Generate sample Roman numerals questions
            this.currentQuiz = this.generateSampleQuiz();
            this.currentQuestion = 0;
            this.userAnswers = {};
            this.bookmarkedQuestions.clear();
            this.timeRemaining = 15 * 60; // 15 minutes
            
            this.navigateTo('quiz');
            this.displayQuestion();
            this.startTimer();
            this.showToast('Quiz started! Good luck!', 'success');
        } catch (error) {
            this.showToast('Failed to start quiz. Please try again.', 'error');
        }
    }

    generateSampleQuiz() {
        const questions = [
            {
                id: 1,
                subject: 'Mathematics',
                text: 'Convert the Roman numeral XLIV to decimal.',
                options: {
                    A: '44',
                    B: '46',
                    C: '54',
                    D: '64'
                },
                correct: 'A',
                explanation: 'XLIV = (50-10) + (5-1) = 40 + 4 = 44'
            },
            {
                id: 2,
                subject: 'Mathematics',
                text: 'What is 89 in Roman numerals?',
                options: {
                    A: 'LXXXIX',
                    B: 'LXXXXIX',
                    C: 'XCIX',
                    D: 'LXXX'
                },
                correct: 'A',
                explanation: '89 = 80 + 9 = LXXX + IX = LXXXIX'
            },
            {
                id: 3,
                subject: 'Mathematics',
                text: 'Convert MCMXC to decimal.',
                options: {
                    A: '1990',
                    B: '1980',
                    C: '1890',
                    D: '1900'
                },
                correct: 'A',
                explanation: 'MCMXC = 1000 + (1000-100) + (100-10) = 1000 + 900 + 90 = 1990'
            }
        ];

        return {
            id: Date.now(),
            title: 'Roman Numerals Quiz',
            subject: 'Mathematics',
            duration: 15 * 60,
            questions: questions
        };
    }

    displayQuestion() {
        if (!this.currentQuiz || !this.currentQuiz.questions[this.currentQuestion]) return;

        const question = this.currentQuiz.questions[this.currentQuestion];
        const questionContainer = document.getElementById('question-container');

        document.getElementById('q-number').textContent = this.currentQuestion + 1;
        document.getElementById('q-subject').textContent = question.subject;
        document.getElementById('question-text').textContent = question.text;
        document.getElementById('current-q').textContent = this.currentQuestion + 1;
        document.getElementById('total-q').textContent = this.currentQuiz.questions.length;

        // Update progress
        const progress = ((this.currentQuestion + 1) / this.currentQuiz.questions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;

        // Display options
        const optionsGrid = document.getElementById('options-grid');
        optionsGrid.innerHTML = '';
        
        Object.entries(question.options).forEach(([key, value]) => {
            const option = document.createElement('div');
            option.className = 'option';
            option.dataset.answer = key;
            option.textContent = `${key}. ${value}`;
            
            if (this.userAnswers[question.id] === key) {
                option.classList.add('selected');
            }
            
            optionsGrid.appendChild(option);
        });

        // Update navigation buttons
        document.getElementById('prev-btn').disabled = this.currentQuestion === 0;
        
        const isLastQuestion = this.currentQuestion === this.currentQuiz.questions.length - 1;
        document.getElementById('next-btn').style.display = isLastQuestion ? 'none' : 'flex';
        document.getElementById('submit-quiz-btn').style.display = isLastQuestion ? 'flex' : 'none';

        // Update bookmark button
        const bookmarkBtn = document.getElementById('bookmark-btn');
        if (this.bookmarkedQuestions.has(question.id)) {
            bookmarkBtn.classList.add('active');
        } else {
            bookmarkBtn.classList.remove('active');
        }
    }

    selectOption(optionElement) {
        const questionId = this.currentQuiz.questions[this.currentQuestion].id;
        const answer = optionElement.dataset.answer;

        // Clear previous selection
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        
        // Select current option
        optionElement.classList.add('selected');
        
        // Store answer
        this.userAnswers[questionId] = answer;
        
        // Enable next button
        document.getElementById('next-btn').disabled = false;
    }

    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestion < this.currentQuiz.questions.length - 1) {
            this.currentQuestion++;
            this.displayQuestion();
        }
    }

    toggleBookmark() {
        const questionId = this.currentQuiz.questions[this.currentQuestion].id;
        const bookmarkBtn = document.getElementById('bookmark-btn');
        
        if (this.bookmarkedQuestions.has(questionId)) {
            this.bookmarkedQuestions.delete(questionId);
            bookmarkBtn.classList.remove('active');
            this.showToast('Bookmark removed', 'info');
        } else {
            this.bookmarkedQuestions.add(questionId);
            bookmarkBtn.classList.add('active');
            this.showToast('Question bookmarked', 'success');
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.submitQuiz();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('quiz-timer').textContent = display;
        
        // Change color when time is running low
        const timerElement = document.getElementById('quiz-timer');
        if (this.timeRemaining < 300) { // Less than 5 minutes
            timerElement.style.background = 'var(--error-color)';
        } else if (this.timeRemaining < 600) { // Less than 10 minutes
            timerElement.style.background = 'var(--warning-color)';
        }
    }

    submitQuiz() {
        clearInterval(this.timer);
        
        const results = this.calculateResults();
        this.displayResults(results);
        this.updateUserStats(results);
        this.navigateTo('results');
    }

    calculateResults() {
        let correctCount = 0;
        let incorrectCount = 0;
        let skippedCount = 0;
        const detailedResults = [];

        this.currentQuiz.questions.forEach(question => {
            const userAnswer = this.userAnswers[question.id];
            let status = 'skipped';
            
            if (userAnswer) {
                if (userAnswer === question.correct) {
                    correctCount++;
                    status = 'correct';
                } else {
                    incorrectCount++;
                    status = 'incorrect';
                }
            } else {
                skippedCount++;
            }

            detailedResults.push({
                question: question.text,
                userAnswer: userAnswer ? question.options[userAnswer] : 'Not answered',
                correctAnswer: question.options[question.correct],
                status: status,
                explanation: question.explanation
            });
        });

        const totalQuestions = this.currentQuiz.questions.length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);

        return {
            correct: correctCount,
            incorrect: incorrectCount,
            skipped: skippedCount,
            total: totalQuestions,
            percentage: percentage,
            detailed: detailedResults
        };
    }

    displayResults(results) {
        document.getElementById('final-score').textContent = results.correct;
        document.getElementById('score-percentage').textContent = `${results.percentage}%`;
        document.getElementById('correct-count').textContent = results.correct;
        document.getElementById('incorrect-count').textContent = results.incorrect;
        document.getElementById('skipped-count').textContent = results.skipped;

        // Set result message
        let message = '';
        if (results.percentage >= 80) {
            message = 'Excellent work! You have mastered Roman numerals!';
        } else if (results.percentage >= 60) {
            message = 'Good job! Keep practicing to improve further.';
        } else if (results.percentage >= 40) {
            message = 'Not bad! Review the concepts and try again.';
        } else {
            message = 'Keep studying! Practice makes perfect.';
        }
        document.getElementById('results-message').textContent = message;

        // Display detailed results
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';
        
        results.detailed.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${result.status}`;
            resultItem.innerHTML = `
                <div class="result-question">Q${index + 1}: ${result.question}</div>
                <div class="result-answer">
                    <span class="user-answer">Your answer: ${result.userAnswer}</span>
                    <span class="correct-answer">Correct: ${result.correctAnswer}</span>
                </div>
            `;
            resultsList.appendChild(resultItem);
        });
    }

    updateUserStats(results) {
        if (!this.currentUser) return;

        this.currentUser.stats.quizzesTaken++;
        
        // Update best score
        if (results.percentage > this.currentUser.stats.bestScore) {
            this.currentUser.stats.bestScore = results.percentage;
        }

        // Calculate new average
        const previousTotal = this.currentUser.stats.averageScore * (this.currentUser.stats.quizzesTaken - 1);
        this.currentUser.stats.averageScore = Math.round((previousTotal + results.percentage) / this.currentUser.stats.quizzesTaken);

        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.updateUserInfo();
    }

    retakeQuiz() {
        this.startQuiz();
    }

    showReviewModal() {
        const modal = document.getElementById('review-modal');
        const reviewGrid = document.getElementById('review-grid');
        
        reviewGrid.innerHTML = '';
        
        this.currentQuiz.questions.forEach((question, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            reviewItem.textContent = index + 1;
            
            if (this.userAnswers[question.id]) {
                reviewItem.classList.add('answered');
            }
            
            if (index === this.currentQuestion) {
                reviewItem.classList.add('current');
            }
            
            if (this.bookmarkedQuestions.has(question.id)) {
                reviewItem.classList.add('bookmarked');
            }
            
            reviewItem.addEventListener('click', () => {
                this.currentQuestion = index;
                this.displayQuestion();
                this.closeModal(modal);
            });
            
            reviewGrid.appendChild(reviewItem);
        });
        
        modal.classList.add('show');
    }

    closeModal(modal) {
        modal.classList.remove('show');
    }

    showSettingsModal() {
        // Implementation for settings modal
        this.showToast('Settings feature coming soon!', 'info');
    }

    toggleMobileNav() {
        document.getElementById('nav-menu').classList.toggle('active');
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.showAuthContainer();
        this.showToast('Logged out successfully', 'info');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = toast.querySelector('.toast-message');
        const toastIcon = toast.querySelector('.toast-icon i');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        // Update icon based on type
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        toastIcon.className = icons[type] || icons.info;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    showQuizHistory() {
        this.showToast('Quiz history feature coming soon!', 'info');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
