const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let mongoConnection = null;

const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    profileImage: { type: String, default: 'https://via.placeholder.com/120' },
    stats: {
        totalQuizzes: { type: Number, default: 0 },
        avgScore: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        rank: { type: Number, default: 0 }
    },
    history: []
}, { timestamps: true });

let User;

app.post('/api/connect-db', async (req, res) => {
    try {
        const { mongoUrl } = req.body;
        
        if (mongoConnection) {
            await mongoose.disconnect();
        }
        
        await mongoose.connect(mongoUrl);
        mongoConnection = mongoose.connection;
        
        User = mongoose.model('User', UserSchema);
        
        res.json({ success: true, message: 'Database connected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Database connection failed', error: error.message });
    }
});

app.post('/api/signup', async (req, res) => {
    try {
        if (!User) {
            return res.status(500).json({ message: 'Database not connected' });
        }
        
        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            profileImage: 'https://via.placeholder.com/120',
            stats: {
                totalQuizzes: 0,
                avgScore: 0,
                bestScore: 0,
                rank: 0
            },
            history: []
        });
        
        await newUser.save();
        
        const userResponse = {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            profileImage: newUser.profileImage,
            stats: newUser.stats,
            history: newUser.history
        };
        
        res.status(201).json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        if (!User) {
            return res.status(500).json({ message: 'Database not connected' });
        }
        
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
            stats: user.stats,
            history: user.history
        };
        
        res.json(userResponse);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/update-user', async (req, res) => {
    try {
        if (!User) {
            return res.status(500).json({ message: 'Database not connected' });
        }
        
        const { userId, updateData } = req.body;
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            profileImage: updatedUser.profileImage,
            stats: updatedUser.stats,
            history: updatedUser.history
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        if (!User) {
            return res.status(500).json({ message: 'Database not connected' });
        }
        
        const users = await User.find({})
            .select('name profileImage stats')
            .sort({ 'stats.bestScore': -1 })
            .limit(10);
        
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
