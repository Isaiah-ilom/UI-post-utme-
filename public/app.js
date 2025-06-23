class QuizApp {
    constructor() {
        this.currentUser = null;
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timerInterval = null;
        this.timeRemaining = 900;
        this.questions = [
            {
                id: 1,
                subject: 'Biology',
                text: 'Which of the following processes occurs in the mitochondria?',
                romanOptions: [
                    'I. Glycolysis',
                    'II. Krebs cycle',
                    'III. Electron transport chain',
                    'IV. Fermentation'
                ],
                options: [
                    'I and II only',
                    'II and III only',
                    'I, II and III',
                    'All of the above'
                ],
                correctAnswer: 'B',
                explanation: 'The Krebs cycle and electron transport chain occur in the mitochondria, while glycolysis occurs in the cytoplasm.'
            },
            {
                id: 2,
                subject: 'Physics',
                text: 'Which of the following are vector quantities?',
                romanOptions: [
                    'I. Displacement',
                    'II. Velocity',
                    'III. Acceleration',
                    'IV. Speed'
                ],
                options: [
                    'I and IV only',
                    'I, II and III only',
                    'II and III only',
                    'All of the above'
                ],
                correctAnswer: 'B',
                explanation: 'Displacement, velocity, and acceleration are vector quantities because they have both magnitude and direction. Speed is a scalar quantity.'
            },
            {
                id: 3,
                subject: 'Chemistry',
                text: 'Which of the following are properties of acids?',
                romanOptions: [
                    'I. Turn blue litmus paper red',
                    'II. Have pH less than 7',
                    'III. React with metals to produce hydrogen',
                    'IV. Taste bitter'
                ],
                options: [
                    'I and II only',
                    'I, II and III only',
                    'II and III only',
                    'I, II, III and IV'
                ],
                correctAnswer: 'B',
                explanation: 'Acids turn blue litmus red, have pH less than 7, and react with metals to produce hydrogen. Bases taste bitter, not acids.'
            }
        ];
        this.mongoUrl = 'mongodb+srv://Utmecbt:isaiahilom@1@utme.7jkkmin.mongodb.net/?retryWrites=true&w=majority&appName=Utme';
        this.users = [];
        this.leaderboard = [];
        this.init();
        this.initImageUpload();
        this.initThemeToggle();
        
    }

    init() {
        this.showLoadingScreen();
        setTimeout(() => {
            this.hideLoadingScreen();
            this.bindEvents();
            this.loadUserData();
        }, 2000);
    }
    initImageUpload() {
    const avatarEdit = document.querySelector('.avatar-edit');
    const profileImg = document.getElementById('profile-img');
    const navUserAvatar = document.querySelector('.user-avatar');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    avatarEdit.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target.result;
                profileImg.src = imageUrl;
                navUserAvatar.src = imageUrl;
                if (this.currentUser) {
                    this.currentUser.profileImage = imageUrl;
                    this.saveUserData();
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('quiz-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (savedTheme === 'dark') {
        themeToggle.checked = true;
    }
    
    themeToggle.addEventListener('change', () => {
        const theme = themeToggle.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('quiz-theme', theme);
    });
}

async connectToMongoDB() {
    try {
        const response = await fetch('/api/connect-db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mongoUrl: this.mongoUrl
            })
        });
        return response.ok;
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        return false;
    }
}

async authenticateUser(email, password, isSignup = false) {
    try {
        const endpoint = isSignup ? '/api/signup' : '/api/login';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const userData = await response.json();
            return userData;
        } else {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
  }
                
    showLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    bindEvents() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.switchPage(e.target.dataset.page));
        });

        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => this.handleActionCard(e.currentTarget.dataset.action));
        });

        document.getElementById('prev-btn').addEventListener('click', () => this.previousQuestion());
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('submit-quiz-btn').addEventListener('click', () => this.submitQuiz());
        document.getElementById('bookmark-btn').addEventListener('click', () => this.bookmarkQuestion());
        document.getElementById('review-btn').addEventListener('click', () => this.showReviewModal());

        document.getElementById('retake-btn').addEventListener('click', () => this.startQuiz());
        document.getElementById('back-dashboard-btn').addEventListener('click', () => this.switchPage('dashboard'));

        document.getElementById('settings-fab').addEventListener('click', () => this.showSettingsModal());
        document.getElementById('close-settings-modal').addEventListener('click', () => this.closeModal('settings-modal'));
        document.getElementById('close-review-modal').addEventListener('click', () => this.closeModal('review-modal'));

        document.getElementById('nav-toggle').addEventListener('click', () => this.toggleMobileMenu());

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
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

        if (this.validateCredentials(email, password)) {
            this.currentUser = this.users.find(user => user.email === email);
            if (!this.currentUser) {
                this.currentUser = {
                    id: Date.now(),
                    name: email.split('@')[0],
                    email: email,
                    password: password,
                    stats: {
                        totalQuizzes: 0,
                        avgScore: 0,
                        bestScore: 0,
                        rank: 0
                    },
                    history: []
                };
                this.users.push(this.currentUser);
            }
            this.showAuthenticatedState();
            this.showToast('Login successful!', 'success');
        } else {
            this.showToast('Invalid credentials!', 'error');
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

        if (this.users.find(user => user.email === email)) {
            this.showToast('Email already exists!', 'error');
            return;
        }

        this.currentUser = {
            id: Date.now(),
            name: name,
            email: email,
            password: password,
            stats: {
                totalQuizzes: 0,
                avgScore: 0,
                bestScore: 0,
                rank: 0
            },
            history: []
        };

        this.users.push(this.currentUser);
        this.showAuthenticatedState();
        this.showToast('Account created successfully!', 'success');
    }

    handleLogout() {
        this.currentUser = null;
        this.showUnauthenticatedState();
        this.showToast('Logged out successfully!', 'info');
    }

    validateCredentials(email, password) {
        return email.includes('@') && password.length >= 6;
    }

    showAuthenticatedState() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('navbar').style.display = 'block';
        document.getElementById('main-content').style.display = 'block';
        
        document.getElementById('user-name').textContent = this.currentUser.name;
        document.getElementById('dashboard-name').textContent = this.currentUser.name;
        
        this.updateDashboardStats();
        this.switchPage('dashboard');
    }

    showUnauthenticatedState() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('navbar').style.display = 'none';
        document.getElementById('main-content').style.display = 'none';
    }

    switchPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        document.getElementById(`${page}-page`).classList.add('active');
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        if (page === 'leaderboard') {
            this.loadLeaderboard();
        } else if (page === 'profile') {
            this.loadProfile();
        }
    }

    handleActionCard(action) {
        switch(action) {
            case 'start-quiz':
                this.startQuiz();
                break;
            case 'view-history':
                this.viewHistory();
                break;
        }
    }

    startQuiz() {
        this.currentQuiz = {
            id: Date.now(),
            questions: [...this.questions],
            startTime: new Date(),
            answers: [],
            bookmarked: []
        };
        
        this.currentQuestionIndex = 0;
        this.userAnswers = new Array(this.questions.length).fill(null);
        this.timeRemaining = 900;
        
        this.switchPage('quiz');
        this.loadQuestion();
        this.startTimer();
    }

    loadQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
        document.getElementById('q-number').textContent = this.currentQuestionIndex + 1;
        document.getElementById('q-subject').textContent = question.subject;
        document.getElementById('question-text').textContent = question.text;
        
        const romanOptions = document.getElementById('roman-options');
        romanOptions.innerHTML = '';
        question.romanOptions.forEach(option => {
            const div = document.createElement('div');
            div.className = 'roman-item';
            div.textContent = option;
            romanOptions.appendChild(div);
        });
        
        const optionsGrid = document.getElementById('options-grid');
        optionsGrid.innerHTML = '';
        question.options.forEach((option, index) => {
            const div = document.createElement('div');
            div.className = 'option';
            div.dataset.answer = String.fromCharCode(65 + index);
            div.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
            div.addEventListener('click', () => this.selectOption(div));
            optionsGrid.appendChild(div);
        });
        
        this.updateProgress();
        this.updateNavigationButtons();
        
        if (this.userAnswers[this.currentQuestionIndex]) {
            const selectedOption = document.querySelector(`[data-answer="${this.userAnswers[this.currentQuestionIndex]}"]`);
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }
        }
    }

    selectOption(optionElement) {
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        optionElement.classList.add('selected');
        
        this.userAnswers[this.currentQuestionIndex] = optionElement.dataset.answer;
        this.updateNavigationButtons();
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('current-q').textContent = this.currentQuestionIndex + 1;
        document.getElementById('total-q').textContent = this.questions.length;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-quiz-btn');
        
        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
            nextBtn.disabled = !this.userAnswers[this.currentQuestionIndex];
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.loadQuestion();
        }
    }

    bookmarkQuestion() {
        const btn = document.getElementById('bookmark-btn');
        const isBookmarked = btn.classList.contains('bookmarked');
        
        if (isBookmarked) {
            btn.classList.remove('bookmarked');
            btn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmark';
        } else {
            btn.classList.add('bookmarked');
            btn.innerHTML = '<i class="fas fa-bookmark"></i> Bookmarked';
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
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
        document.getElementById('quiz-timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    submitQuiz() {
        clearInterval(this.timerInterval);
        
        const score = this.calculateScore();
        const quizResult = {
            id: this.currentQuiz.id,
            startTime: this.currentQuiz.startTime,
            endTime: new Date(),
            score: score,
            totalQuestions: this.questions.length,
            answers: this.userAnswers,
            questions: this.questions
        };
        
        this.currentUser.history.push(quizResult);
        this.updateUserStats(score);
        this.showResults(quizResult);
    }

    calculateScore() {
        let correct = 0;
        this.userAnswers.forEach((answer, index) => {
            if (answer === this.questions[index].correctAnswer) {
                correct++;
            }
        });
        return correct;
    }

    updateUserStats(score) {
        const percentage = (score / this.questions.length) * 100;
        this.currentUser.stats.totalQuizzes++;
        
        if (percentage > this.currentUser.stats.bestScore) {
            this.currentUser.stats.bestScore = percentage;
        }
        
        const totalScore = this.currentUser.history.reduce((sum, quiz) => 
            sum + (quiz.score / quiz.totalQuestions) * 100, 0);
        this.currentUser.stats.avgScore = totalScore / this.currentUser.stats.totalQuizzes;
        
        this.updateDashboardStats();
    }

    showResults(quizResult) {
        const score = quizResult.score;
        const total = quizResult.totalQuestions;
        const percentage = (score / total) * 100;
        
        document.getElementById('final-score').textContent = score;
        document.getElementById('score-percentage').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('correct-count').textContent = score;
        document.getElementById('incorrect-count').textContent = total - score;
        document.getElementById('skipped-count').textContent = 
            this.userAnswers.filter(answer => answer === null).length;
        
        let message = '';
        if (percentage >= 80) message = 'Excellent work!';
        else if (percentage >= 60) message = 'Good job!';
        else if (percentage >= 40) message = 'Keep practicing!';
        else message = 'Need more study!';
        
        document.getElementById('results-message').textContent = message;
        
        this.loadDetailedResults(quizResult);
        this.switchPage('results');
    }

    loadDetailedResults(quizResult) {
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';
        
        quizResult.questions.forEach((question, index) => {
            const userAnswer = quizResult.answers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-number">Q${index + 1}</span>
                    <span class="result-subject">${question.subject}</span>
                    <span class="result-status">
                        <i class="fas fa-${isCorrect ? 'check' : 'times'}"></i>
                    </span>
                </div>
                <div class="result-question">${question.text}</div>
                <div class="result-answers">
                    <div class="user-answer">
                        Your answer: ${userAnswer || 'Not answered'}
                    </div>
                    <div class="correct-answer">
                        Correct answer: ${question.correctAnswer}
                    </div>
                </div>
                <div class="result-explanation">${question.explanation}</div>
            `;
            resultsList.appendChild(resultItem);
        });
    }

    updateDashboardStats() {
        if (!this.currentUser) return;
        
        document.getElementById('total-quizzes').textContent = this.currentUser.stats.totalQuizzes;
        document.getElementById('avg-score').textContent = `${this.currentUser.stats.avgScore.toFixed(1)}%`;
        document.getElementById('best-score').textContent = `${this.currentUser.stats.bestScore.toFixed(1)}%`;
        document.getElementById('user-rank').textContent = `#${this.currentUser.stats.rank || 'N/A'}`;
    }

    loadLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading leaderboard...</p></div>';
        
        setTimeout(() => {
            const sortedUsers = [...this.users]
                .filter(user => user.stats.totalQuizzes > 0)
                .sort((a, b) => b.stats.bestScore - a.stats.bestScore)
                .slice(0, 10);
            
            leaderboardList.innerHTML = '';
            
            if (sortedUsers.length === 0) {
                leaderboardList.innerHTML = '<div class="no-data">No data available</div>';
                return;
            }
            
            sortedUsers.forEach((user, index) => {
                const leaderboardItem = document.createElement('div');
                leaderboardItem.className = 'leaderboard-item';
                leaderboardItem.innerHTML = `
                    <div class="rank">#${index + 1}</div>
                    <div class="user-info">
                        <img src="https://via.placeholder.com/50" alt="User" class="user-avatar">
                        <div class="user-details">
                            <h4>${user.name}</h4>
                            <p>${user.stats.totalQuizzes} quizzes taken</p>
                        </div>
                    </div>
                    <div class="user-score">${user.stats.bestScore.toFixed(1)}%</div>
                `;
                leaderboardList.appendChild(leaderboardItem);
            });
        }, 1000);
    }

    loadProfile() {
        if (!this.currentUser) return;
        
        document.getElementById('profile-name').textContent = this.currentUser.name;
        document.getElementById('profile-email').textContent = this.currentUser.email;
        document.getElementById('profile-quizzes').textContent = this.currentUser.stats.totalQuizzes;
        document.getElementById('profile-avg').textContent = `${this.currentUser.stats.avgScore.toFixed(1)}%`;
        document.getElementById('profile-best').textContent = `${this.currentUser.stats.bestScore.toFixed(1)}%`;
        
        this.loadRecentActivity();
        this.loadAchievements();
    }

    loadRecentActivity() {
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        
        if (this.currentUser.history.length === 0) {
            activityList.innerHTML = '<div class="no-activity">No recent activity</div>';
            return;
        }
        
        const recentQuizzes = this.currentUser.history.slice(-5).reverse();
        
        recentQuizzes.forEach(quiz => {
            const percentage = (quiz.score / quiz.totalQuestions) * 100;
            const timeAgo = this.getTimeAgo(quiz.endTime);
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-quiz"></i>
                </div>
                <div class="activity-info">
                    <h4>Completed Roman Numerals Quiz</h4>
                    <p>Score: ${quiz.score}/${quiz.totalQuestions} (${percentage.toFixed(1)}%)</p>
                    <span class="activity-time">${timeAgo}</span>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    }

    loadAchievements() {
        const achievementsGrid = document.getElementById('achievements-grid');
        const achievements = [
            {
                title: 'First Quiz',
                description: 'Complete your first quiz',
                icon: 'trophy',
                unlocked: this.currentUser.stats.totalQuizzes >= 1
            },
            {
                title: 'Perfect Score',
                description: 'Score 100% on a quiz',
                icon: 'star',
                unlocked: this.currentUser.stats.bestScore === 100
            },
            {
                title: 'Quiz Master',
                description: 'Complete 10 quizzes',
                icon: 'medal',
                unlocked: this.currentUser.stats.totalQuizzes >= 10
            }
        ];
        
        achievementsGrid.innerHTML = '';
        achievements.forEach(achievement => {
            const achievementItem = document.createElement('div');
            achievementItem.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            achievementItem.innerHTML = `
                <div class="achievement-icon">
                    <i class="fas fa-${achievement.icon}"></i>
                </div>
                <div class="achievement-info">
                    <h4>${achievement.title}</h4>
                    <p>${achievement.description}</p>
                </div>
            `;
            achievementsGrid.appendChild(achievementItem);
        });
    }

    showReviewModal() {
        const modal = document.getElementById('review-modal');
        const reviewGrid = document.getElementById('review-grid');
        
        reviewGrid.innerHTML = '';
        this.questions.forEach((question, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = `review-item ${this.userAnswers[index] ? 'answered' : 'unanswered'}`;
            reviewItem.innerHTML = `
                <div class="review-number">Q${index + 1}</div>
                <div class="review-subject">${question.subject}</div>
                <div class="review-status">
                    ${this.userAnswers[index] ? 
                        `<i class="fas fa-check"></i> ${this.userAnswers[index]}` : 
                        '<i class="fas fa-minus"></i> Unanswered'
                    }
                </div>
            `;
            reviewItem.addEventListener('click', () => {
                this.currentQuestionIndex = index;
                this.loadQuestion();
                this.closeModal('review-modal');
            });
            reviewGrid.appendChild(reviewItem);
        });
        
        modal.style.display = 'flex';
    }

    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        document.getElementById('mongodb-url').value = this.mongoUrl;
        modal.style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        navMenu.classList.toggle('active');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = toast.querySelector('.toast-message');
        const toastIcon = toast.querySelector('.toast-icon i');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toastIcon.className = `fas fa-${icons[type] || icons.info}`;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    loadUserData() {
        const savedUsers = JSON.parse(localStorage.getItem('quiz-users') || '[]');
        this.users = savedUsers;
    }

    saveUserData() {
        localStorage.setItem('quiz-users', JSON.stringify(this.users));
    }

    viewHistory() {
        this.switchPage('profile');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});
