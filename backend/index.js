require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const XLSX = require("xlsx");
const mammoth = require("mammoth");
const JSZip = require("jszip");
const http = require("http");
const socketIo = require("socket.io");
const { encryptString, decryptString } = require("./utils/crypto");
const { getSubtitles } = require('youtube-captions-scraper');
// pdf import moved to inline require in route due to v2 API requirements
const { generateMCQs } = require("./utils/quizGenerator");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
// serve uploaded files statically
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use("/uploads", express.static(UPLOAD_DIR));

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9-_]/gi, "_");
    cb(null, `${base}-${unique}${ext}`);
  },
});
const upload = multer({ storage });

// connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("FATAL: MONGODB_URI is not defined in .env");
  process.exit(1);
}

// Disable buffering immediately so operations fail fast if not connected
mongoose.set("bufferCommands", false);

mongoose
  .connect(MONGODB_URI, {
    dbName: process.env.DB_NAME || "intelliquiz",
  })
  .then(() => {
    console.log("Connected to MongoDB successfully");
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB Connection Error!");
    if (err.message.includes("Server selection timed out") || err.message.includes("ETIMEOUT")) {
      console.error("POSSIBLY AN IP WHITELIST ISSUE: Please ensure your current IP is whitelisted in MongoDB Atlas (Network Access).");
    }
    console.error("Details:", err.message);
  });


// models
const User = require("./Model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Resource = require("./Model/Resource");
const DiscussionPost = require("./Model/DissussionPostModel");
const DiscussionReply = require("./Model/DiscussionReply");
const Quiz = require("./Model/Quiz");
const Question = require("./Model/Question");
const QuizResult = require("./Model/QuizResult");
const QuizAssignment = require("./Model/QuizAssignment");
const Poll = require("./Model/Poll");
const PollSession = require("./Model/PollSession");
const PollAssignment = require("./Model/PollAssignment");
const Classroom = require("./Model/Classroom");
const LearningSession = require("./Model/LearningSession");

// --- Socket.IO Namespaces ---
const leaderboardNamespace = io.of("/leaderboard");

const discussionNamespace = io.of("/discussion");

function notifyNewReply(reply) {
  discussionNamespace.emit("newReply", reply);
}

async function getLeaderboardData() {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn("Mongoose not connected, returning empty leaderboard");
      return [];
    }
    const topUsers = await User.find({ role: "STUDENT" })
      .sort({ points: -1 })
      .limit(10)
      .lean();
    return topUsers;
  } catch (err) {
    console.error("Error fetching leaderboard data:", err);
    return [];
  }
}

async function updateLeaderboard() {
  const leaderboardData = await getLeaderboardData();
  leaderboardNamespace.emit("update", leaderboardData);
}

leaderboardNamespace.on("connection", async (socket) => {
  console.log("Client connected to leaderboard");
  const leaderboardData = await getLeaderboardData();
  socket.emit("initialData", leaderboardData);
});

const assignmentsNamespace = io.of("/assignments");

function notifyNewAssignment(assignment) {
  assignmentsNamespace.emit("newAssignment", assignment);
}

function notifyDeassignQuiz(quizId, studentIds) {
  assignmentsNamespace.emit("deassignQuiz", { quizId, studentIds });
}

assignmentsNamespace.on("connection", (socket) => {
  console.log("Client connected to assignments");
});

const classroomsNamespace = io.of("/classrooms");

function notifyMeetingStarted(classroomId, classCode) {
  classroomsNamespace.emit("meetingStarted", { classroomId, classCode });
}

function notifyMeetingEnded(classroomId) {
  classroomsNamespace.emit("meetingEnded", { classroomId });
}

classroomsNamespace.on("connection", (socket) => {
  console.log("Client connected to classrooms socket");
});



// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Users
app.get("/api/users", async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
});

// Leaderboard route
app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboardData = await getLeaderboardData();
    res.json(leaderboardData);
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

app.post("/api/leaderboard/update", async (req, res) => {
  await updateLeaderboard();
  res.status(200).json({ message: "Leaderboard update triggered" });
});

async function triggerN8nWebhook(quizId, studentIds, defaultTeacherId = null) {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) return;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return;

    const teacher = await User.findById(defaultTeacherId || quiz.createdBy);
    if (!teacher) return;

    const students = await User.find({ _id: { $in: studentIds } });
    const studentEmails = students.map(s => s.email).filter(e => e);

    if (studentEmails.length === 0) return;

    const payload = {
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      quizTitle: quiz.title,
      quizLink: `http://localhost:5173/student`,
      studentEmails: studentEmails,
    };

    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(err => console.error("Failed to send n8n webhook:", err));
  } catch(e) {
    console.error("Error triggering n8n webhook:", e);
  }
}

app.get("/api/assignments", async (req, res) => {
  const assignments = await QuizAssignment.find();
  res.json(assignments);
});

// Create an assignment (intended for admins)
app.post("/api/assignments", authenticateJWT, async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      quizId,
      studentIds,
      deadline,
      timeLimit,
      numQuestionsToAssign,
      isLive,
    } = payload;
    if (!quizId || !Array.isArray(studentIds)) {
      return res
        .status(400)
        .json({ error: "quizId and studentIds are required" });
    }
    const assignment = await QuizAssignment.create({
      quizId,
      studentIds,
      deadline,
      timeLimit,
      numQuestionsToAssign,
      isLive,
    });
    notifyNewAssignment(assignment);
    triggerN8nWebhook(quizId, studentIds, req.user ? (req.user.id || req.user._id) : null);
    res.status(201).json(assignment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// Fetch assignment for a specific quiz
app.get("/api/assignments/by-quiz/:quizId", async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const assignment = await QuizAssignment.findOne({ quizId });
    res.json(assignment || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

// Update (or create) assignment for a specific quiz
app.put("/api/assignments/by-quiz/:quizId", async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const { studentIds, deadline, timeLimit, isLive } = req.body || {};
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: "studentIds array is required" });
    }

    const existingAssignment = await QuizAssignment.findOne({ quizId });
    const oldStudentIds = existingAssignment ? existingAssignment.studentIds.map(id => id.toString()) : [];

    const update = {
      quizId,
      studentIds,
      deadline,
      timeLimit,
      isLive,
    };
    const assignment = await QuizAssignment.findOneAndUpdate(
      { quizId },
      update,
      { new: true, upsert: true }
    );

    // Notify de-assigned students
    const deassignedStudentIds = oldStudentIds.filter(id => !studentIds.includes(id));
    if (deassignedStudentIds.length > 0) {
      notifyDeassignQuiz(quizId, deassignedStudentIds);
    }

    // Notify newly assigned students
    const newStudentIds = studentIds.filter(id => !oldStudentIds.includes(id));
    if (newStudentIds.length > 0) {
      const newAssignmentData = { ...assignment.toObject(), studentIds: newStudentIds };
      notifyNewAssignment(newAssignmentData);
      triggerN8nWebhook(quizId, newStudentIds, req.user ? (req.user.id || req.user._id) : null);
    }

    res.json(assignment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

app.get("/api/results", async (req, res) => {
  const results = await QuizResult.find();
  res.json(results);
});

app.get("/api/discussions", async (req, res) => {
  const discussionsPost = await DiscussionPost.find().populate(
    "DiscussionReply"
  );
  const discussionsReply = await DiscussionReply.find();
  res.json({ post: discussionsPost, reply: discussionsReply });
});

app.post("/api/discussions", async (req, res) => {
  const discussion = await DiscussionPost.create({
    title: req.body.title,
    content: req.body.content,
    authorId: req.body.authorId,
  });

  res.json(discussion);
});

app.post("/api/discussions/reply", async (req, res) => {
  try {
    const { authorId, content } = req.body.optimistic;

    // Create the reply
    const createReply = await DiscussionReply.create({
      authorId,
      content,
    });

    // Find the main post and push the reply ID
    const mainPost = await DiscussionPost.findById(req.body.postId);
    if (!mainPost) {
      return res.status(404).json({ error: "Discussion post not found" });
    }

    mainPost.replies.push(createReply._id);
    await mainPost.save();

    notifyNewReply(createReply);

    res.json({ message: "Reply added to discussion post", reply: createReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/assignments/:id", async (req, res) => {
  const assignmentId = req.params.id;

  // Example: filter results by assignmentId
  const results = await QuizAssignment.findById(assignmentId);

  res.json(results);
});

app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.get("/api/quizzes", async (req, res) => {
  const quizzes = await Quiz.find().populate("questionPool").lean();
  const decrypted = (quizzes || []).map((q) => ({
    ...q,
    questionPool: (q.questionPool || []).map((ques) => ({
      ...ques,
      questionText: decryptString(ques.questionText),
      options: (ques.options || []).map((o) => decryptString(o)),
      correctTextAnswer: ques.correctTextAnswer ? decryptString(ques.correctTextAnswer) : undefined,
    })),
  }));
  res.json(decrypted);
});

app.post("/api/quizzes/:quizID/submit", async (req, res) => {
  try {
    const resultData = req.body;
    const results = await QuizResult.create({
      quizId: resultData.quizId,
      userId: resultData.userId,
      score: resultData.score,
      answers: resultData.answers,
      timeTaken: resultData.timeTaken,
      submittedAt: resultData.submittedAt,
    });

    // Find the user and add points
    const user = await User.findById(resultData.userId);
    if (user) {
      user.points = (user.points || 0) + resultData.score;
      await user.save();
    }

    // Update leaderboard
    await updateLeaderboard();



    res.json(results);
  } catch (error) {
    console.error("Failed to submit quiz result:", error);
    res.status(500).json({ error: "Failed to submit quiz result" });
  }
});

// Create a quiz (intended for teachers)
app.post("/api/quizzes", async (req, res) => {
  try {
    const quiz = req.body || {};
    if (!quiz.title || !Array.isArray(quiz.questions)) {
      return res
        .status(400)
        .json({ error: "title and questions are required" });
    }

    const questionIds = await Promise.all(
      (quiz.questions || []).map(async (q) => {
        const created = await Question.create({
          questionText: encryptString(q.questionText),
          topic: q.topic,
          type: q.type || 'multiple-choice',
          options: (q.options || []).map((opt) => encryptString(opt)),
          correctAnswerIndex: q.correctAnswerIndex,
          correctTextAnswer: q.correctTextAnswer ? encryptString(q.correctTextAnswer) : undefined,
        });
        return created._id;
      })
    );

    const newQuiz = await Quiz.create({
      title: quiz.title,
      questionPool: questionIds,
      createdBy: req.body.createdBy || (req.user ? (req.user.id || req.user._id) : undefined),
    });

    res.status(201).json(newQuiz);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

app.post("/api/users", async (req, res) => {
  const data = req.body || {};
  const name = data.username || data.name;
  const user = await User.create({
    name,
    email: data.email,
    role: data.role,
    password: data.password,
    points: data.points,
  });
  res.status(201).json(user);
});

// Admin: update a user's password by id
app.put("/api/users/:id/password", async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body || {};
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "password is required" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = password; // pre-save hook will hash
    await user.save();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update password" });
  }
});

// --- AUTH ---
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// simple JWT auth middleware
function authenticateJWT(req, res, next) {
  const auth = req.headers && req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post("/api/user/signup", async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body || {};
    const finalName = username || name;

    const existingUser = await User.findOne({ name: finalName });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const newUser = await User.create({
      name: finalName,
      email,
      password,
      role: role || "STUDENT",
    });

    const token = signToken(newUser);
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed. Database might be unreachable." });
  }
});

app.post("/api/user/student-login", async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password)
      return res.status(400).json({ error: "name and password required" });
    const user = await User.findOne({ name });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Authentication failed. Database might be unreachable." });
  }
});

app.post("/api/user/teacher-login", async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password)
      return res.status(400).json({ error: "name and password required" });
    const user = await User.findOne({ name });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Authentication failed. Database might be unreachable." });
  }
});

app.post("/api/user/teacher-signup", async (req, res) => {
  try {
    const name = req.body.username;
    const password = req.body.password;

    // Check for existing user
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create new user
    const newUser = await User.create({
      name,
      email: req.body.email,
      password,
      role: req.body.role === "ADMIN" ? "ADMIN" : "TEACHER",
    });

    const token = signToken(newUser);
    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed. Database might be unreachable." });
  }
});

// Resources
app.get("/api/resources", async (req, res) => {
  const items = await Resource.find().lean();
  res.json(items);
});

app.post("/api/resources", async (req, res) => {
  const item = await Resource.create(req.body);
  res.status(201).json(item);
});

// Discussion posts
app.get("/api/posts", async (req, res) => {
  const posts = await DiscussionPost.find().populate("replies").lean();
  res.json(posts);
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await DiscussionPost.findById(req.params.id)
      .populate("replies")
      .lean();
    if (!post) {
      return res.status(404).json({ error: "Discussion post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("Failed to fetch discussion post:", error);
    res.status(500).json({ error: "Failed to fetch discussion post" });
  }
});

// Quizzes - return with populated questions so clients see full question pool
app.get("/api/quizzes", async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate("questionPool").lean();
    const decrypted = (quizzes || []).map((q) => ({
      ...q,
      questionPool: (q.questionPool || []).map((ques) => ({
        ...ques,
        questionText: decryptString(ques.questionText),
        options: (ques.options || []).map((o) => decryptString(o)),
        correctTextAnswer: ques.correctTextAnswer ? decryptString(ques.correctTextAnswer) : undefined,
      })),
    }));
    res.json(decrypted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load quizzes" });
  }
});

// --- Polls ---
app.post("/api/polls", authenticateJWT, async (req, res) => {
  try {
    const { title, questions } = req.body || {};
    if (!questions || !Array.isArray(questions) || questions.length === 0)
      return res.status(400).json({ error: "questions are required" });
    // only TEACHER or ADMIN can create polls
    if (!req.user || !["TEACHER", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const createdBy = req.user.id || req.user._id;
    const poll = await Poll.create({ title, questions, createdBy });
    res.status(201).json(poll);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

app.get("/api/polls", async (req, res) => {
  try {
    const polls = await Poll.find().lean();
    res.json(polls);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

// Start a poll session (create counts and expiration)
app.post("/api/polls/:id/start", authenticateJWT, async (req, res) => {
  try {
    const pollId = req.params.id;
    const { timeLimitSeconds } = req.body || {};
    const poll = await Poll.findById(pollId).lean();
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // End any existing active sessions for this poll
    await PollSession.updateMany({ pollId, active: true }, { active: false });

    // initialize votes for first question
    const firstQuestion = (poll.questions || [])[0] || { options: [] };
    const votes = (firstQuestion.options || []).map(() => 0);
    const currentQuestionIndex = 0;
    const startedAt = new Date();
    const expiresAt = timeLimitSeconds ? new Date(Date.now() + timeLimitSeconds * 1000) : null;
    const session = await PollSession.create({ pollId, votes, startedAt, expiresAt, active: true, currentQuestionIndex });
    res.status(201).json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start poll session" });
  }
});

// Assign poll to students (teacher/admin only)
app.post('/api/polls/:id/assign', authenticateJWT, async (req, res) => {
  try {
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const pollId = req.params.id;
    const { studentIds, deadline, timeLimit, isLive } = req.body || {};
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array required' });
    }
    const assignment = await PollAssignment.create({ pollId, studentIds, deadline, timeLimit, isLive });
    res.status(201).json(assignment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to assign poll' });
  }
});

app.get('/api/polls/assignments/by-poll/:pollId', async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const assignment = await PollAssignment.findOne({ pollId }).lean();
    res.json(assignment || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch poll assignment' });
  }
});

// Get polls assigned to current user
app.get('/api/polls/assigned', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id);
    if (!userId) return res.status(400).json({ error: 'Invalid user' });
    const assignments = await PollAssignment.find({ studentIds: userId }).lean();
    const pollIds = assignments.map(a => a.pollId);
    const polls = await Poll.find({ _id: { $in: pollIds } }).lean();
    // merge assignment info into poll
    const merged = polls.map(p => {
      const assign = assignments.find(a => String(a.pollId) === String(p._id));
      return { ...p, assignment: assign };
    });
    res.json(merged);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch assigned polls' });
  }
});
// Vote on active poll session
app.post("/api/polls/:id/vote", async (req, res) => {
  try {
    const pollId = req.params.id;
    const { optionIndex, userId } = req.body || {};
    const session = await PollSession.findOne({ pollId, active: true }).sort({ startedAt: -1 });
    if (!session) return res.status(400).json({ error: "No active poll session" });
    if (session.expiresAt && new Date() > session.expiresAt) {
      session.active = false;
      await session.save();
      return res.status(400).json({ error: "Poll session expired" });
    }
    // ensure optionIndex is valid for current question
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= session.votes.length) {
      return res.status(400).json({ error: "Invalid optionIndex" });
    }
    // Prevent duplicate votes by same userId (optional)
    if (userId && session.voters && session.voters.includes(userId)) {
      return res.status(400).json({ error: "User already voted" });
    }

    session.votes[optionIndex] = (session.votes[optionIndex] || 0) + 1;
    if (userId) session.voters.push(userId);
    await session.save();
    res.json({ success: true, session });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to record vote" });
  }
});

// Get current session for a poll
app.get("/api/polls/:id/session", async (req, res) => {
  try {
    const pollId = req.params.id;
    // Get the most recent session (active or inactive) to show results
    const session = await PollSession.findOne({ pollId }).sort({ startedAt: -1 }).lean();
    if (!session) return res.json(null);
    const now = new Date();
    const timeLeft = session.expiresAt ? Math.max(0, new Date(session.expiresAt) - now) : null;
    res.json({ ...session, timeLeft });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch poll session" });
  }
});

// Advance to next question in active poll session
app.post('/api/polls/:id/next', authenticateJWT, async (req, res) => {
  try {
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const pollId = req.params.id;
    const { timeLimitSeconds } = req.body || {};
    const poll = await Poll.findById(pollId).lean();
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    const session = await PollSession.findOne({ pollId, active: true }).sort({ startedAt: -1 });
    if (!session) return res.status(400).json({ error: 'No active session to advance' });

    const nextIndex = (session.currentQuestionIndex || 0) + 1;
    if (nextIndex >= (poll.questions || []).length) {
      // end session
      session.active = false;
      await session.save();
      return res.json({ message: 'Poll session ended' });
    }

    // reset votes for next question
    const nextOptions = (poll.questions || [])[nextIndex].options || [];
    session.currentQuestionIndex = nextIndex;
    session.votes = nextOptions.map(() => 0);
    session.voters = [];
    session.startedAt = new Date();
    session.expiresAt = timeLimitSeconds ? new Date(Date.now() + timeLimitSeconds * 1000) : null;
    await session.save();
    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to advance poll' });
  }
});

// Delete a poll
app.delete('/api/polls/:id', authenticateJWT, async (req, res) => {
  try {
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const pollId = req.params.id;

    // Delete the poll
    const poll = await Poll.findByIdAndDelete(pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // Delete associated sessions
    await PollSession.deleteMany({ pollId });

    // Delete associated assignments
    await PollAssignment.deleteMany({ pollId });

    res.json({ message: 'Poll deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// Upload a resource file (admin)
app.post("/api/resources/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    const resource = await Resource.create({
      title: req.body.title || req.file.originalname,
      content: fileUrl,
      type: "file",
    });
    res.status(201).json(resource);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download resource helper (if needed for non-static)
app.get("/api/resources/download/:filename", async (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.download(filePath);
});


// --- YouTube Learning Assistant Endpoints ---

// Fetch Transcript from YouTube via SerpAPI
app.get('/api/transcript', async (req, res) => {
  const videoId = req.query.v;
  const language_code = req.query.lc || req.query.language_code;

  console.log(`[SerpAPI] Fetching transcript for video: ${videoId}, language: ${language_code || 'default'}`);

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  const serpApiKey = process.env.SERP_API_KEY;
  if (!serpApiKey) {
    return res.status(500).json({ error: 'Server missing SerpAPI credentials.' });
  }

  try {
    const { getJson } = require('serpapi');

    const params = {
      engine: 'youtube_video_transcript',
      v: videoId,
      api_key: serpApiKey,
    };
    if (language_code) {
      params.language_code = language_code;
    }

    console.log(`[SerpAPI] Requesting transcript with params:`, { ...params, api_key: '***' });
    const data = await getJson(params);

    if (!data.transcript || data.transcript.length === 0) {
      return res.status(404).json({
        error: "No captions available for this video.",
        hint: "This video may not have subtitles, or it may be restricted/private."
      });
    }

    // SerpAPI returns { transcript, chapters, available_transcripts } 
    // transcript items have: start_ms, end_ms, snippet, start_time_text
    // This matches the frontend's expected format exactly.
    // Generate a simple summary from the first few transcript segments
    const summarySnippets = data.transcript.slice(0, Math.min(10, data.transcript.length));
    const summary = summarySnippets.map(s => s.snippet || s.text || '').join(' ').substring(0, 500);

    res.json({
      transcript: data.transcript,
      title: `Transcript for ${videoId}`,
      summary: summary,
      chapters: data.chapters || [],
      available_transcripts: data.available_transcripts || [],
    });

  } catch (error) {
    console.error("[SerpAPI] Transcript fetch error:", error.message || error);
    res.status(500).json({
      error: "Failed to fetch transcript.",
      details: error.message || String(error),
      hint: "The SerpAPI service may be unavailable or the video ID is invalid."
    });
  }
});


// Generate MCQs from transcript (used by Learning page)
app.post('/api/generate-mcqs', async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: 'Transcript array is required.' });
    }

    // Build full text from transcript segments
    // SerpAPI format: { snippet, start_time_text }
    // Legacy format: { text, start }
    const fullText = transcript.map(t => t.snippet || t.text || '').join(' ');

    if (fullText.trim().length < 50) {
      return res.status(400).json({ error: 'Transcript text is too short to generate questions.' });
    }

    const numQuestions = 5;
    const rawQuestions = generateMCQs(fullText, numQuestions);

    if (!rawQuestions || rawQuestions.length === 0) {
      return res.status(400).json({ error: 'Could not generate questions from this transcript. The content may be too short or repetitive.' });
    }

    // Map to the format the Learning.tsx frontend expects
    const mcqs = rawQuestions.map(q => {
      const correctAnswer = q.options[q.correctAnswerIndex];

      // Find which transcript segment the question came from
      let sourceTimestamp = "0:00";
      for (const seg of transcript) {
        const segText = (seg.snippet || seg.text || '').toLowerCase();
        if (segText.includes(correctAnswer.toLowerCase())) {
          sourceTimestamp = seg.start_time_text || formatSeconds(seg.start || 0);
          break;
        }
      }

      return {
        question: q.questionText,
        options: q.options,
        correct_answer: correctAnswer,
        explanation: `The correct answer "${correctAnswer}" was found in the transcript at ${sourceTimestamp}.`,
        source_timestamp: sourceTimestamp,
      };
    });

    // Build a simple summary from the first few transcript segments
    const summarySnippets = transcript.slice(0, Math.min(5, transcript.length));
    const summary = summarySnippets.map(s => s.snippet || s.text || '').join(' ').substring(0, 500);

    res.json({ mcqs, summary });

  } catch (error) {
    console.error("MCQ generation error:", error.message);
    res.status(500).json({ error: "Failed to generate MCQs.", details: error.message });
  }
});

// Helper: format seconds to MM:SS
function formatSeconds(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}


// Generic File to Quiz Endpoint (No-LLM) - Supports .pdf, .docx, .xlsx, .pptx, .txt
app.post("/api/quizzes/generate-from-file", upload.single("file"), async (req, res) => {
  try {
    console.log("File Upload received:", req.file ? req.file.originalname : "No file");
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let extractedText = "";

    try {
      if (ext === ".pdf") {
        const { PDFParse } = require("pdf-parse");
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new PDFParse({ data: dataBuffer });
        const result = await parser.getText();
        extractedText = result.text;
        await parser.destroy();
      } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: req.file.path });
        extractedText = result.value || "";
      } else if (ext === ".xlsx") {
        const wb = XLSX.readFile(req.file.path);
        const sheets = wb.SheetNames;
        const parts = sheets.map((name) => XLSX.utils.sheet_to_csv(wb.Sheets[name]));
        extractedText = parts.join("\n");
      } else if (ext === ".pptx") {
        const buffer = fs.readFileSync(req.file.path);
        const zip = await JSZip.loadAsync(buffer);
        const slideFiles = Object.keys(zip.files).filter(
          (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
        );
        const parts = await Promise.all(
          slideFiles.map(async (name) => {
            const xml = await zip.files[name].async("string");
            const matches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)];
            return matches.map((m) => m[1]).join(" ");
          })
        );
        extractedText = parts.join("\n\n");
      } else if (ext === ".txt") {
        extractedText = fs.readFileSync(req.file.path, "utf8");
      } else {
        return res.status(415).json({ error: `Unsupported file type: ${ext}` });
      }
    } catch (parseErr) {
      console.error(`Parsing Error for ${ext}:`, parseErr);
      return res.status(500).json({ error: `Failed to extract text from ${ext} file.` });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({ error: "Extracted text is too short to generate a quiz. Please provide a more descriptive file." });
    }

    const numQuestions = parseInt(req.body.numQuestions) || 5;
    console.log(`Generating ${numQuestions} MCQs from ${ext} using No-LLM logic...`);

    const questions = generateMCQs(extractedText, numQuestions);

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: "Could not identify enough key concepts in this file to generate questions." });
    }

    res.json({
      title: req.body.title || req.file.originalname.replace(ext, "") + " Quiz",
      questions: questions,
      textSnippet: extractedText.substring(0, 1000)
    });
  } catch (err) {
    console.error("Critical File Processor Error:", err);
    res.status(500).json({ error: "Server error during file processing" });
  }
});

app.post("/api/delete", async (req, res) => {
  const user = await User.findByIdAndDelete(req.body.userId);
  // console.log(user);
  const users = await User.find({}).lean();
  res.status(201).json(users);
});

app.post("/api/create-quiz", authenticateJWT, async (req, res) => {
  try {
    // console.log(req.body.assignment);

    const questionIds = await Promise.all(
      req.body.pool.map(async (individual) => {
        const question = await Question.create({
          questionText: encryptString(individual.questionText),
          topic: individual.topic,
          options: (individual.options || []).map((ans) => encryptString(ans)),
          correctAnswerIndex: individual.correctAnswerIndex,
        });
        return question._id;
      })
    );

    const newQuiz = await Quiz.create({
      title: req.body.quiz.title,
      questionPool: questionIds,
      isPractice: req.body.quiz.isPractice || false,
      createdBy: req.user ? (req.user.id || req.user._id) : undefined,
    });

    const newAssignment = await QuizAssignment.create({
      quizId: newQuiz._id,
      studentIds: [...req.body.assignment.studentIds],
      deadline: req.body.assignment.deadline,
      timeLimit: req.body.assignment.timeLimit,
      isLive: req.body.assignment.isLive,
      numQuestionsToAssign: req.body.assignment.numQuestionsToAssign,
    });

    notifyNewAssignment(newAssignment);
    triggerN8nWebhook(newQuiz._id, newAssignment.studentIds, req.user ? (req.user.id || req.user._id) : null);

    res.status(201).json({ quiz: newQuiz, assignment: newAssignment });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

// Delete Quiz
app.delete("/api/quizzes/:id", authenticateJWT, async (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    // Delete associated questions
    if (quiz.questionPool && quiz.questionPool.length > 0) {
      await Question.deleteMany({ _id: { $in: quiz.questionPool } });
    }

    // Delete the quiz itself
    await Quiz.findByIdAndDelete(quizId);

    // Delete associated assignments
    await QuizAssignment.deleteMany({ quizId: quizId });

    res.json({ message: "Quiz, questions, and assignments deleted successfully" });
  } catch (err) {
    console.error("Delete Quiz Error:", err);
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});

// Update Quiz
app.put("/api/quizzes/:id", authenticateJWT, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { title, pool } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    if (title) quiz.title = title;

    if (pool) {
      // Delete old questions
      if (quiz.questionPool && quiz.questionPool.length > 0) {
        await Question.deleteMany({ _id: { $in: quiz.questionPool } });
      }

      // Create new ones
      const questionIds = await Promise.all(
        pool.map(async (individual) => {
          const question = await Question.create({
            questionText: encryptString(individual.questionText),
            topic: individual.topic,
            options: (individual.options || []).map((ans) => encryptString(ans)),
            correctAnswerIndex: individual.correctAnswerIndex,
          });
          return question._id;
        })
      );
      quiz.questionPool = questionIds;
    }

    await quiz.save();
    res.json(quiz);
  } catch (err) {
    console.error("Update Quiz Error:", err);
    res.status(500).json({ error: "Failed to update quiz" });
  }
});

// GET Student Analytics
app.get("/api/users/:id/analytics", authenticateJWT, async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.id !== userId && !['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Query 1: Fetch all quiz results for the user
    const results = await QuizResult.find({ userId }).sort({ submittedAt: -1 }).lean();
    if (!results || results.length === 0) {
      return res.json({ grade: 0, strengths: [], weaknesses: [], allTopics: [], recentHistory: [], stats: { totalQuizzes: 0, totalScore: 0 } });
    }

    // Extract all question IDs to fetch in one go (Query 2)
    const questionIds = [...new Set(results.flatMap(r => (r.answers || []).map(a => a.questionId)))];
    
    // Query 2: Fetch all questions involved in those results
    const questions = await Question.find({ _id: { $in: questionIds } }).lean();
    const questionMap = questions.reduce((map, q) => {
      map[q._id.toString()] = q;
      return map;
    }, {});

    const topicStats = {};
    let totalScoreSum = 0;

    results.forEach(result => {
      totalScoreSum += (result.score || 0);
      if (result.answers) {
        result.answers.forEach(ans => {
          const q = questionMap[ans.questionId?.toString()];
          if (q && q.topic) {
            if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
            topicStats[q.topic].total++;
            if (ans.isCorrect) topicStats[q.topic].correct++;
          }
        });
      }
    });

    const allTopics = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      score: Math.round((stats.correct / stats.total) * 100),
      total: stats.total,
      correct: stats.correct
    })).sort((a, b) => b.score - a.score);

    const strengths = allTopics.filter(t => t.total >= 1 && t.score >= 80);
    const weaknesses = allTopics.filter(t => t.total >= 1 && t.score <= 55);

    // Query 3: Get user info for personalization
    const user = await User.findById(userId).select('name role').lean();

    res.json({
      grade: Math.round(totalScoreSum / results.length),
      stats: {
        totalQuizzes: results.length,
        totalPoints: totalScoreSum,
        userName: user?.name
      },
      strengths,
      weaknesses,
      allTopics,
      recentHistory: results.slice(0, 5).map(r => ({
        score: r.score,
        date: r.submittedAt,
        quizId: r.quizId
      }))
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ error: "Failed to calculate analytics" });
  }
});

app.post("/api/user/signup", async (req, res) => {
  try {
    const name = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!name || !password)
      return res.status(400).json({ error: "username and password required" });

    const exists = await User.findOne({ name });
    if (exists) {
      return res.status(409).json({ error: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      role: "STUDENT",
      password,
    });

    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed. Database might be unreachable." });
  }
});

// --- Classrooms ---

// Create classroom (Teacher only)
app.post("/api/classrooms", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers can create classrooms" });
    }
    const { name, description, studentIds } = req.body;
    if (!name) return res.status(400).json({ error: "Class name is required" });

    // Generate unique class code
    let classCode;
    let isUnique = false;
    while (!isUnique) {
      classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await Classroom.findOne({ classCode });
      if (!existing) isUnique = true;
    }

    const classroom = await Classroom.create({
      name,
      description,
      teacher: req.user.id,
      classCode,
      students: studentIds || [],
    });
    res.status(201).json(classroom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create classroom" });
  }
});

// Join classroom (Student only)
app.post("/api/classrooms/join", authenticateJWT, async (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) return res.status(400).json({ error: "Class code is required" });

    const classroom = await Classroom.findOne({ classCode });
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    // Add student if not already in list
    if (!classroom.students.includes(req.user.id)) {
      classroom.students.push(req.user.id);
      await classroom.save();
    }
    res.json(classroom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to join classroom" });
  }
});

// List classrooms
app.get("/api/classrooms", authenticateJWT, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "TEACHER") {
      query = { teacher: req.user.id };
    } else if (req.user.role === "STUDENT") {
      query = { students: req.user.id };
    }
    const classrooms = await Classroom.find(query).populate("teacher", "name").lean();
    res.json(classrooms);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
});

// Get classroom detail
app.get("/api/classrooms/:id", authenticateJWT, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate("teacher", "name")
      .populate("students", "name")
      .lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });
    res.json(classroom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch classroom" });
  }
});

// Upload resource for classroom
app.post("/api/classrooms/:id/resources", authenticateJWT, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers can upload resources" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;
    const resource = await Resource.create({
      title: req.body.title || req.file.originalname,
      content: fileUrl,
      type: "file",
      classroomId: req.params.id,
    });
    res.status(201).json(resource);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get resources for classroom
app.get("/api/classrooms/:id/resources", authenticateJWT, async (req, res) => {
  try {
    const resources = await Resource.find({ classroomId: req.params.id }).lean();
    res.json(resources);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// Meeting controls
app.post("/api/classrooms/:id/start-meeting", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers can start meetings" });
    }
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    classroom.isMeetingLive = true;
    await classroom.save();

    notifyMeetingStarted(classroom._id, classroom.classCode);
    res.json({ success: true, isMeetingLive: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start meeting" });
  }
});

app.post("/api/classrooms/:id/end-meeting", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers can end meetings" });
    }
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    classroom.isMeetingLive = false;
    await classroom.save();

    notifyMeetingEnded(classroom._id);
    res.json({ success: true, isMeetingLive: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to end meeting" });
  }
});

// catch-all error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// --- Learning Sessions ---

// Save or update a learning session
app.post("/api/learning/save", authenticateJWT, async (req, res) => {
  try {
    const { videoId, videoTitle, thumbnail, summary, quiz, userProgress } = req.body;
    const userId = req.user.id;

    if (!videoId) return res.status(400).json({ error: "videoId is required" });

    // Try to find existing session for this user and video
    let session = await LearningSession.findOne({ userId, videoId });

    if (session) {
      // Update existing session
      if (videoTitle) session.videoTitle = videoTitle;
      if (thumbnail) session.thumbnail = thumbnail;
      if (summary) session.summary = summary;
      if (quiz) session.quiz = quiz;
      if (userProgress) session.userProgress = userProgress;
      await session.save();
    } else {
      // Create new session
      session = await LearningSession.create({
        userId,
        videoId,
        videoTitle,
        thumbnail,
        summary,
        quiz,
        userProgress
      });
    }

    res.json(session);
  } catch (e) {
    console.error("Save learning session error:", e);
    res.status(500).json({ error: "Failed to save learning session" });
  }
});

// Get all learning sessions for current user
app.get("/api/learning/sessions", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await LearningSession.find({ userId }).sort({ updatedAt: -1 }).lean();
    res.json(sessions);
  } catch (e) {
    console.error("Fetch learning sessions error:", e);
    res.status(500).json({ error: "Failed to fetch learning sessions" });
  }
});

// Get specific learning session by ID
app.get("/api/learning/session/:id", authenticateJWT, async (req, res) => {
  try {
    const session = await LearningSession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Safety check: ensure session belongs to user
    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(session);
  } catch (e) {
    console.error("Fetch specific session error:", e);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

app.get("/api/youtube/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Query 'q' is required" });
  }

  try {
    const yts = require('yt-search'); // yt-search is usually CJS, but keeping it here for safety or refactoring later
    const r = await yts(q);
    const videos = r.videos.slice(0, 10).map(v => ({
      title: v.title,
      link: v.url,
      id: v.videoId,
      thumbnail: v.thumbnail,
      description: v.description,
      channel: v.author.name
    }));
    res.json(videos);
  } catch (e) {
    console.error("YouTube search error:", e);
    res.status(500).json({ error: "Failed to fetch YouTube results" });
  }
});

// --- Deepgram Transcription ---

app.post("/api/upload-audio", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1. Read the raw file buffer saved by Multer
    const fileBuffer = fs.readFileSync(req.file.path);
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Server missing Deepgram credentials" });
    }

    const axios = require('axios');

    // 2. Forward the binary buffer to Deepgram's API using Axios
    const response = await axios.post(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
      fileBuffer,
      {
        headers: {
          Authorization: `Token ${apiKey}`, // Securely inject API Key from .env
          "Content-Type": req.file.mimetype || "application/octet-stream",
        },
      }
    );

    // 3. After success, clean up the temporary Multer file to save disk space
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
    });

    // 4. Parse the Deepgram word list into readable sentence chunks (similar to frontend logic)
    const data = response.data;
    const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    const chunks = [];
    let currentChunk = { start: 0, text: "" };

    for (const word of words) {
      if (currentChunk.text === "") currentChunk.start = word.start;
      currentChunk.text += word.punctuated_word + " ";

      if (word.end - currentChunk.start > 5) {
        const date = new Date(currentChunk.start * 1000).toISOString();
        chunks.push({
          start_time_text: date.substring(11, 19).replace(/^00:/, ''),
          snippet: currentChunk.text.trim()
        });
        currentChunk = { start: 0, text: "" };
      }
    }

    if (currentChunk.text.trim()) {
      const date = new Date(currentChunk.start * 1000).toISOString();
      chunks.push({
        start_time_text: date.substring(11, 19).replace(/^00:/, ''),
        snippet: currentChunk.text.trim()
      });
    }

    const fullTranscript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    
    // Generate summary
    const summarySnippets = chunks.slice(0, Math.min(10, chunks.length));
    const summary = summarySnippets.map(s => s.snippet).join(' ').substring(0, 500);

    // 5. Return processed results
    res.json({
      transcript: chunks.length > 0 ? chunks : [{ start_time_text: "0:00", snippet: fullTranscript }],
      full_text: fullTranscript,
      summary: summary
    });

  } catch (error) {
    console.error("Deepgram Proxy Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to transcribe audio via proxy." });
  }
});

// Final error handler (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// server.listen was moved to the mongoose.connect .then block to ensure DB is ready first.
