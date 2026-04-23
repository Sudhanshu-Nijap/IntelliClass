const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./Model/User');
const Question = require('./Model/Question');
const QuizResult = require('./Model/QuizResult');

async function fillAnalytics() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'intelliquiz' });
        console.log("Connected to MongoDB");

        // 1. Define topics
        const topics = [
            { name: 'Data Structures', strength: true },
            { name: 'Algorithms', strength: true },
            { name: 'Web Security', strength: false },
            { name: 'Database Management', strength: false },
            { name: 'Computer Networks', strength: true },
            { name: 'React.js', strength: true },
            { name: 'Node.js', strength: false }
        ];

        // 2. Create actual Question documents for these topics
        console.log("Creating/Ensuring mock questions exist...");
        const mockQuestions = [];
        for (const t of topics) {
            let q = await Question.findOne({ topic: t.name, questionText: `Analytics Mock: ${t.name}` });
            if (!q) {
                q = await Question.create({
                    questionText: `Analytics Mock: ${t.name}`,
                    topic: t.name,
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswerIndex: 0
                });
            }
            mockQuestions.push(q);
        }

        const students = await User.find({ role: 'STUDENT' });
        console.log(`Found ${students.length} students to fill data for.`);

        for (const student of students) {
            const results = [];
            
            // Create a result for each topic
            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];
                const question = mockQuestions[i];
                
                // For "Strengths", we need at least 1 correct answer (since I lowered threshold to 1)
                // Strength = 90-100%, Weakness = 20-40%
                const score = topic.strength ? (Math.floor(Math.random() * 11) + 90) : (Math.floor(Math.random() * 21) + 20);
                
                results.push({
                    userId: student._id,
                    score: score,
                    timeTaken: 120,
                    submittedAt: new Date(),
                    answers: [
                        {
                            questionId: question._id,
                            isCorrect: topic.strength,
                            selectedOptionIndex: 0
                        }
                    ]
                });
            }

            // Also add some random activity for the heatmap over the last 6 months
            const now = new Date();
            for (let d = 0; d < 120; d++) {
                if (Math.random() > 0.8) { // 20% activity
                    const activityDate = new Date();
                    activityDate.setDate(now.getDate() - d);
                    results.push({
                        userId: student._id,
                        score: Math.floor(Math.random() * 50) + 50,
                        timeTaken: 60,
                        submittedAt: activityDate,
                        answers: []
                    });
                }
            }

            await QuizResult.insertMany(results);
            console.log(`Filled analytics data for student: ${student.name}`);
        }

        console.log("\nSUCCESS: All student profiles populated with Strengths and Weaknesses!");
        process.exit(0);
    } catch (err) {
        console.error("Error filling analytics:", err);
        process.exit(1);
    }
}

fillAnalytics();
