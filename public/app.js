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
        
        if (!avatarEdit) return;
        
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
                    if (profileImg) profileImg.src = imageUrl;
                    if (navUserAvatar) navUserAvatar.src = imageUrl;
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
        if (!themeToggle) return;
        
        const savedTheme = JSON.parse(localStorage.getItem('quiz-theme') || '"light"');
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if (savedTheme === 'dark') {
            themeToggle.checked = true;
        }
        
        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('quiz-theme', JSON.stringify(theme));
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
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    bindEvents() {
        const authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target.dataset.tab));
        });

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.switchPage(e.target.dataset.page));
        });

        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleActionCard(e.currentTarget.dataset.action));
        });

        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousQuestion());
        }

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        const submitQuizBtn = document.getElementById('submit-quiz-btn');
        if (submitQuizBtn) {
            submitQuizBtn.addEventListener('click', () => this.submitQuiz());
        }

        const bookmarkBtn = document.getElementById('bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => this.bookmarkQuestion());
        }

        const reviewBtn = document.getElementById('review-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', () => this.showReviewModal());
        }

        const retakeBtn = document.getElementById('retake-btn');
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => this.startQuiz());
        }

        const backDashboardBtn = document.getElementById('back-dashboard-btn');
        if (backDashboardBtn) {
            backDashboardBtn.addEventListener('click', () => this.switchPage('dashboard'));
        }

        const settingsFab = document.getElementById('settings-fab');
        if (settingsFab) {
            settingsFab.addEventListener('click', () => this.showSettingsModal());
        }

        const closeSettingsModal = document.getElementById('close-settings-modal');
        if (closeSettingsModal) {
            closeSettingsModal.addEventListener('click', () => this.closeModal('settings-modal'));
        }

        const closeReviewModal = document.getElementById('close-review-modal');
        if (closeReviewModal) {
            closeReviewModal.addEventListener('click', () => this.closeModal('review-modal'));
        }

        const navToggle = document.getElementById('nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        const dbSettingsForm = document.getElementById('db-settings-form');
        if (dbSettingsForm) {
            dbSettingsForm.addEventListener('submit', (e) => this.handleDbSettings(e));
        }
    }

    handleDbSettings(e) {
        e.preventDefault();
        const mongoUrlInput = document.getElementById('mongodb-url');
        if (mongoUrlInput) {
            const newUrl = mongoUrlInput.value;
            this.mongoUrl = newUrl;
            localStorage.setItem('quiz-mongo-url', JSON.stringify(newUrl));
            this.closeModal('settings-modal');
            this.showToast('Database settings saved!', 'success');
        }
    }

    switchAuthTab(tab) {
        const authTabs = document.querySelectorAll('.auth-tab');
        const authForms = document.querySelectorAll('.auth-form');
        
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        
        const targetTab = document.querySelector(`[data-tab="${tab}"]`);
        const targetForm = document.getElementById(`${tab}-form`);
        
        if (targetTab) targetTab.classList.add('active');
        if (targetForm) targetForm.classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        if (!emailInput || !passwordInput) return;
        
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!this.validateCredentials(email, password)) {
            this.showToast('Invalid email or password format!', 'error');
            return;
        }

        try {
            this.showToast('Authenticating...', 'info');
            const userData = await this.authenticateUser(email, password, false);
            
            this.currentUser = userData;
            if (userData.profileImage) {
                const profileImg = document.getElementById('profile-img');
                const userAvatar = document.querySelector('.user-avatar');
                if (profileImg) profileImg.src = userData.profileImage;
                if (userAvatar) userAvatar.src = userData.profileImage;
            }
            
            this.showAuthenticatedState();
            this.showToast('Login successful!', 'success');
        } catch (error) {
            const existingUser = this.users.find(user => user.email === email && user.password === password);
            if (existingUser) {
                this.currentUser = existingUser;
                this.showAuthenticatedState();
                this.showToast('Login successful (offline mode)!', 'success');
            } else {
                this.showToast(error.message || 'Invalid credentials!', 'error');
            }
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const confirmPasswordInput = document.getElementById('signup-confirm');
        
        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) return;
        
        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match!', 'error');
            return;
        }

        if (!this.validateCredentials(email, password)) {
            this.showToast('Invalid email or password format!', 'error');
            return;
        }

        if (this.users.find(user => user.email === email)) {
            this.showToast('Email already exists!', 'error');
            return;
        }

        try {
            this.showToast('Creating account...', 'info');
            const userData = await this.authenticateUser(email, password, true);
            
            this.currentUser = userData;
            this.users.push(userData);
            this.saveUserData();
            
            this.showAuthenticatedState();
            this.showToast('Account created successfully!', 'success');
        } catch (error) {
            this.currentUser = {
                id: Date.now(),
                name: name,
                email: email,
                password: password,
                profileImage: 'https://via.placeholder.com/120',
                stats: {
                    totalQuizzes: 0,
                    avgScore: 0,
                    bestScore: 0,
                    rank: 0
                },
                history: []
            };

            this.users.push(this.currentUser);
            this.saveUserData();
            this.showAuthenticatedState();
            this.showToast('Account created (offline mode)!', 'success');
        }
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
        const authContainer = document.getElementById('auth-container');
        const navbar = document.getElementById('navbar');
        const mainContent = document.getElementById('main-content');
        
        if (authContainer) authContainer.style.display = 'none';
        if (navbar) navbar.style.display = 'block';
        if (mainContent) mainContent.style.display = 'block';
        
        const userName = document.getElementById('user-name');
        const dashboardName = document.getElementById('dashboard-name');
        
        if (userName && this.currentUser) userName.textContent = this.currentUser.name;
        if (dashboardName && this.currentUser) dashboardName.textContent = this.currentUser.name;
        
        this.updateDashboardStats();
        this.switchPage('dashboard');
    }

    showUnauthenticatedState() {
        const authContainer = document.getElementById('auth-container');
        const navbar = document.getElementById('navbar');
        const mainContent = document.getElementById('main-content');
        
        if (authContainer) authContainer.style.display = 'flex';
        if (navbar) navbar.style.display = 'none';
        if (mainContent) mainContent.style.display = 'none';
    }

    switchPage(page) {
        const pages = document.querySelectorAll('.page');
        const navLinks = document.querySelectorAll('.nav-link');
        
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(link => link.classList.remove('active'));
        
        const targetPage = document.getElementById(`${page}-page`);
        const targetNavLink = document.querySelector(`[data-page="${page}"]`);
        
        if (targetPage) targetPage.classList.add('active');
        if (targetNavLink) targetNavLink.classList.add('active');

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
        
        const qNumber = document.getElementById('q-number');
        const qSubject = document.getElementById('q-subject');
        const questionText = document.getElementById('question-text');
        
        if (qNumber) qNumber.textContent = this.currentQuestionIndex + 1;
        if (qSubject) qSubject.textContent = question.subject;
        if (questionText) questionText.textContent = question.text;
        
        const romanOptions = document.getElementById('roman-options');
        if (romanOptions) {
            romanOptions.innerHTML = '';
            question.romanOptions.forEach(option => {
                const div = document.createElement('div');
                div.className = 'roman-item';
                div.textContent = option;
                romanOptions.appendChild(div);
            });
        }
        
        const optionsGrid = document.getElementById('options-grid');
        if (optionsGrid) {
            optionsGrid.innerHTML = '';
            question.options.forEach((option, index) => {
                const div = document.createElement('div');
                div.className = 'option';
                div.dataset.answer = String.fromCharCode(65 + index);
                div.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
                div.addEventListener('click', () => this.selectOption(div));
                optionsGrid.appendChild(div);
            });
        }
        
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
        const options = document.querySelectorAll('.option');
        options.forEach(opt => opt.classList.remove('selected'));
        optionElement.classList.add('selected');
        
        this.userAnswers[this.currentQuestionIndex] = optionElement.dataset.answer;
        this.updateNavigationButtons();
    }

    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const currentQ = document.getElementById('current-q');
        const totalQ = document.getElementById('total-q');
        
        if (progressFill) {
            const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
        
        if (currentQ) currentQ.textContent = this.currentQuestionIndex + 1;
        if (totalQ) totalQ.textContent = this.questions.length;
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-quiz-btn');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'inline-flex';
        } else {
            if (nextBtn) {
                nextBtn.style.display = 'inline-flex';
                nextBtn.disabled = false;
            }
            if (submitBtn) submitBtn.style.display = 'none';
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
        if (!btn) return;
        
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
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.submitQuiz();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const quizTimer = document.getElementById('quiz-timer');
        if (quizTimer) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            quizTimer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    submitQuiz() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
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
        
        if (this.currentUser) {
            this.currentUser.history.push(quizResult);
            this.updateUserStats(score);
            this.saveUserData();
        }
        
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
        if (!this.currentUser) return;
        
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
        
        const finalScore = document.getElementById('final-score');
        const scorePercentage = document.getElementById('score-percentage');
        const correctCount = document.getElementById('correct-count');
        const incorrectCount = document.getElementById('incorrect-count');
        const skippedCount = document.getElementById('skipped-count');
        const resultsMessage = document.getElementById('results-message');
        
        if (finalScore) finalScore.textContent = score;
        if (scorePercentage) scorePercentage.textContent = `${percentage.toFixed(1)}%`;
        if (correctCount) correctCount.textContent = score;
        if (incorrectCount) incorrectCount.textContent = total - score;
        if (skippedCount) {
            skippedCount.textContent = this.userAnswers.filter(answer => answer === null).length;
        }
        
        let message = '';
        if (percentage >= 80) message = 'Excellent work!';
        else if (percentage >= 60) message = 'Good job!';
        else if (percentage >= 40) message = 'Keep practicing!';
        else message = 'Need more study!';
        
        if (resultsMessage) resultsMessage.textContent = message;
        
        this.loadDetailedResults(quizResult);
        this.switchPage('results');
    }

    loadDetailedResults(quizResult) {
        const resultsList = document.getElementById('results-list');
        if (!resultsList) return;
        
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
        
        const totalQuizzes = document.getElementById('total-quizzes');
        const avgScore = document.getElementById('avg-score');
        const bestScore = document.getElementById('best-score');
        const userRank = document.getElementById('user-rank');
        
        if (totalQuizzes) totalQuizzes.textContent = this.currentUser.stats.totalQuizzes;
        if (avgScore) avgScore.textContent = `${this.currentUser.stats.avgScore.toFixed(1)}%`;
        if (bestScore) bestScore.textContent = `${this.currentUser.stats.bestScore.toFixed(1)}%`;
        if (userRank) userRank.textContent = `#${this.currentUser.stats.rank || 'N/A'}`;
    }

    loadLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
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
                        <img src="${user.profileImage || 'https://via.placeholder.com/50'}" alt="User" class="user-avatar">
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
        
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileQuizzes = document.getElementById('profile-quizzes');
        const profileAvg = document.getElementById('profile-avg');
        const profileBest = document.getElementById('profile-best');
        
        if (profileName) profileName.textContent = this.currentUser.name;
        if (profileEmail) profileEmail.textContent = this.currentUser.email;
        if (profileQuizzes) profileQuizzes.textContent = this.currentUser.stats.totalQuizzes;
        if (profileAvg) profileAvg.textContent = `${this.currentUser.stats.avgScore.toFixed(1)}%`;
        if (profileBest) profileBest.textContent = `${this.currentUser.stats.bestScore.toFixed(1)}%`;
        
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
    const savedUrl = localStorage.getItem('quiz-mongo-url');
    if (savedUrl) {
        this.mongoUrl = savedUrl;
    }
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
