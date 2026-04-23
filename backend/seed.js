const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./Model/User');
const QuizResult = require('./Model/QuizResult');
const Quiz = require('./Model/Quiz');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedUser(name, password, points) {
    // 1. Ensure User exists
    let user = await User.findOne({ name });
    if (!user) {
        console.log(`Creating user: ${name}`);
        user = new User({
            name,
            role: 'STUDENT',
            points,
            password
        });
        await user.save();
    } else {
        console.log(`User ${name} already exists, updating points and password`);
        user.points = points;
        user.password = password;
        await user.save();
    }

    // 2. Remove old results for this user
    await QuizResult.deleteMany({ userId: user._id });
    console.log(`Cleared old quiz results for ${name}`);

    // 3. Create Topic-Specific Quizzes for Strengths and Weaknesses
    const topics = [
        { title: 'DSA', score: 95 },
        { title: 'Web Development', score: 88 },
        { title: 'Mathematics', score: 45 },
        { title: 'Physics', score: 38 },
        { title: 'History', score: 92 },
        { title: 'Chemistry', score: 55 }
    ];

    const results = [];
    for (const topic of topics) {
        let quiz = await Quiz.findOne({ title: topic.title });
        if (!quiz) {
            quiz = new Quiz({ title: topic.title, questionPool: [] });
            await quiz.save();
        }
        
        results.push({
            quizId: quiz._id,
            userId: user._id,
            score: topic.score,
            timeTaken: 120,
            submittedAt: new Date(),
            answers: new Array(10).fill({ isCorrect: true })
        });
    }

    // 4. Generate random activity over the last 180 days (Heatmap)
    const now = new Date();
    const rangeDays = 180;
    const startDate = new Date();
    startDate.setDate(now.getDate() - rangeDays);

    let heatmapQuiz = await Quiz.findOne({ title: 'General Knowledge' });
    if (!heatmapQuiz) {
        heatmapQuiz = new Quiz({ title: 'General Knowledge', questionPool: [] });
        await heatmapQuiz.save();
    }

    for (let i = 0; i < 350; i++) {
        const randomDaysOffset = Math.floor(Math.random() * rangeDays);
        const submittedAt = new Date(startDate);
        submittedAt.setDate(startDate.getDate() + randomDaysOffset);
        submittedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        results.push({
            quizId: heatmapQuiz._id,
            userId: user._id,
            score: Math.floor(Math.random() * 40) + 60,
            timeTaken: Math.floor(Math.random() * 300) + 60,
            submittedAt: submittedAt,
            answers: []
        });
    }

    await QuizResult.insertMany(results);
    console.log(`Inserted ${results.length} quiz results for ${name}`);
}

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI, { dbName: 'intelliquiz' });
        console.log('Connected to MongoDB (intelliquiz)');

        await seedUser('ansh', '123456789', 2500);
        await seedUser('test123', 'test123', 1800);

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
    }
}

seed();
