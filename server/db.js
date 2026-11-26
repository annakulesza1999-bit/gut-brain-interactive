import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'runtime-db.json');

// Default initial database schema
const defaultDb = {
  trainers: [],
  students: [],
  sessions: [],
  examResults: []
};

class Database {
  constructor() {
    this.data = structuredClone(defaultDb);
    if(process.env.GM_PILOT_TEST!=='1')this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(raw);
        if (!this.data.trainers) this.data.trainers = [];
      } else {
        this.data = structuredClone(defaultDb);
        this.save();
      }
    } catch (e) {
      console.error('Error loading database, initializing new db:', e);
      this.data = structuredClone(defaultDb);
      this.save();
    }
  }

  save() {
    if(process.env.GM_PILOT_TEST==='1')return;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // --- Trainer Operations ---
  getAllTrainers() {
    if (!this.data.trainers) this.data.trainers = [];
    return this.data.trainers;
  }

  findTrainerByName(name) {
    if (!name) return null;
    if (!this.data.trainers) this.data.trainers = [];
    const clean = name.toLowerCase().trim();
    return this.data.trainers.find(t => t.name.toLowerCase().trim() === clean) || null;
  }

  createOrUpdateTrainer(name, additionalData = {}) {
    if (!name || !name.trim()) return null;
    if (!this.data.trainers) this.data.trainers = [];

    const cleanName = name.trim();
    let trainer = this.findTrainerByName(cleanName);

    if (!trainer) {
      trainer = {
        id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: cleanName,
        title: additionalData.title || 'Technical Trainer',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalSessions: 1,
        ...additionalData
      };
      this.data.trainers.push(trainer);
    } else {
      trainer.lastActive = new Date().toISOString();
      if (additionalData.sessionCode) {
        trainer.totalSessions = (trainer.totalSessions || 0) + 1;
      }
      Object.assign(trainer, additionalData);
    }

    this.save();
    return trainer;
  }

  deleteTrainer(idOrName) {
    if (!idOrName) return false;
    if (!this.data.trainers) this.data.trainers = [];
    const clean = idOrName.toLowerCase().trim();
    const initialLen = this.data.trainers.length;
    this.data.trainers = this.data.trainers.filter(t => t.id !== idOrName && t.name.toLowerCase().trim() !== clean);
    if (this.data.trainers.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Student Operations ---
  findStudentByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return this.data.students.find(s => s.phone.replace(/\D/g, '') === cleanPhone) || null;
  }

  findStudentByName(name) {
    if (!name) return null;
    return this.data.students.find(s => s.name.toLowerCase().trim() === name.toLowerCase().trim()) || null;
  }

  createOrUpdateStudent(phone, name) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanName = (name || '').trim();

    let student = this.findStudentByPhone(cleanPhone);
    if (!student && cleanName) {
      // Check if student exists by name without phone
      student = this.findStudentByName(cleanName);
      if (student && !student.phone) {
        student.phone = cleanPhone;
      }
    }

    if (!student) {
      student = {
        id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        phone: cleanPhone,
        name: cleanName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalQuizzes: 0,
        totalScore: 0,
        avgAccuracy: 0,
        history: []
      };
      this.data.students.push(student);
    } else {
      if (cleanName && student.name !== cleanName) {
        student.name = cleanName;
        student.updatedAt = new Date().toISOString();
      }
      if (cleanPhone && (!student.phone || student.phone.length < 5)) {
        student.phone = cleanPhone;
      }
    }

    this.save();
    return student;
  }

  updateStudentProfile(phoneOrId, { name, phone, department, bio }) {
    let student = this.data.students.find(s => s.id === phoneOrId || s.phone === phoneOrId);
    if (!student) return null;

    if (name) student.name = name.trim();
    if (phone) student.phone = phone.replace(/\D/g, '');
    if (department !== undefined) student.department = department;
    if (bio !== undefined) student.bio = bio;
    student.updatedAt = new Date().toISOString();

    // Update studentName across their exam results
    this.data.examResults.forEach(er => {
      if (er.studentId === student.id || er.studentPhone === student.phone) {
        if (name) er.studentName = name.trim();
      }
    });

    this.save();
    return student;
  }

  getAllStudents() {
    return this.data.students.map(s => {
      const studentExams = this.data.examResults.filter(er => er.studentId === s.id || er.studentPhone === s.phone);
      const totalScore = studentExams.reduce((sum, e) => sum + (e.score || 0), 0);
      const avgAcc = studentExams.length > 0 ? Math.round(studentExams.reduce((sum, e) => sum + (e.accuracy || 0), 0) / studentExams.length) : 0;

      return {
        id: s.id,
        phone: s.phone,
        name: s.name,
        totalQuizzes: studentExams.length,
        totalScore,
        avgAccuracy: avgAcc,
        lastExamDate: studentExams.length > 0 ? studentExams[studentExams.length - 1].date : null,
        history: studentExams
      };
    });
  }

  getStudentFullProfile(phoneOrId) {
    let student = this.data.students.find(s => s.id === phoneOrId || s.phone === phoneOrId);
    if (!student && phoneOrId) {
      const clean = String(phoneOrId).replace(/\D/g, '');
      student = this.data.students.find(s => s.phone.replace(/\D/g, '') === clean);
    }
    if (!student) return null;

    const studentExams = this.data.examResults.filter(er => er.studentId === student.id || er.studentPhone === student.phone);
    const totalScore = studentExams.reduce((sum, e) => sum + (e.score || 0), 0);
    const avgAccuracy = studentExams.length > 0 ? Math.round(studentExams.reduce((sum, e) => sum + (e.accuracy || 0), 0) / studentExams.length) : 0;

    // Build timeline progression data for charts
    const timelineData = studentExams.map((ex, idx) => ({
      examIndex: idx + 1,
      title: ex.quizTitle || `Quiz ${idx + 1}`,
      sessionCode: ex.sessionCode,
      date: ex.date,
      score: ex.score,
      accuracy: ex.accuracy,
      rank: ex.rank,
      totalQuestions: ex.totalQuestions
    }));

    // Aggregate category performance across all exams
    const categoryAgg = {};
    studentExams.forEach(ex => {
      if (Array.isArray(ex.answersDetail)) {
        ex.answersDetail.forEach(ans => {
          const cat = ans.category || 'General';
          if (!categoryAgg[cat]) {
            categoryAgg[cat] = { category: cat, totalAttempts: 0, correctCount: 0 };
          }
          categoryAgg[cat].totalAttempts++;
          if (ans.isCorrect) categoryAgg[cat].correctCount++;
        });
      }
    });

    const categoryPerformance = Object.values(categoryAgg).map(c => ({
      category: c.category,
      accuracy: c.totalAttempts > 0 ? Math.round((c.correctCount / c.totalAttempts) * 100) : 0,
      totalAttempts: c.totalAttempts
    }));

    return {
      student: {
        id: student.id,
        phone: student.phone,
        name: student.name,
        department: student.department || '',
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
      },
      stats: {
        totalQuizzes: studentExams.length,
        totalScore,
        avgAccuracy,
        bestRank: studentExams.length > 0 ? Math.min(...studentExams.map(e => e.rank || 99)) : null
      },
      timeline: timelineData,
      categoryPerformance,
      examHistory: studentExams
    };
  }

  // --- Session & Exam Result Operations ---
  recordCompletedExam(sessionCode, sessionData, analytics) {
    const sessionRecord = {
      id: `sess-${sessionCode}-${Date.now()}`,
      code: sessionCode,
      title: sessionData.title || "Digi Warriors Technical Assessment",
      trainerName: sessionData.trainerName || "Trainer",
      date: new Date().toISOString().split('T')[0],
      totalQuestions: sessionData.questions?.length || 20,
      totalParticipants: sessionData.participants?.length || 0,
      avgScore: analytics?.avgScore || 0,
      avgAccuracy: analytics?.avgAccuracy || 0
    };

    this.data.sessions.push(sessionRecord);

    const questionsList = sessionData.questions || [];

    sessionData.participants.forEach((p, idx) => {
      let student = this.findStudentByPhone(p.phone) || this.findStudentByName(p.name);
      if (!student) {
        student = this.createOrUpdateStudent(p.phone || `98765${Math.floor(10000 + Math.random() * 90000)}`, p.name);
      }

      const answersObj = p.answers || {};
      const answeredCount = Object.keys(answersObj).length;
      const correctCount = Object.values(answersObj).filter(a => a.isCorrect).length;
      const accuracy = sessionRecord.totalQuestions > 0 ? Math.round((correctCount / sessionRecord.totalQuestions) * 100) : 0;

      const detailedAnswers = Object.entries(answersObj).map(([qIdx, ans]) => {
        const q = questionsList[Number(qIdx)] || {};
        return {
          questionIndex: Number(qIdx),
          questionId: q.id,
          question: q.question,
          category: q.category || 'General',
          selectedOption: ans.selectedOption,
          isCorrect: ans.isCorrect,
          pointsEarned: ans.pointsEarned,
          responseTimeMs: ans.responseTimeMs
        };
      });

      const examRecord = {
        id: `res-${sessionCode}-${student.id}-${Date.now()}`,
        studentId: student.id,
        studentPhone: student.phone || p.phone,
        studentName: student.name,
        sessionCode: sessionCode,
        quizTitle: sessionRecord.title,
        date: sessionRecord.date,
        totalQuestions: sessionRecord.totalQuestions,
        correctAnswers: correctCount,
        score: p.score,
        accuracy,
        rank: p.currentRank || (idx + 1),
        answersDetail: detailedAnswers
      };

      this.data.examResults.push(examRecord);
    });

    this.save();
    console.log(`[DB] Saved completed exam session ${sessionCode} with ${sessionData.participants.length} participant records.`);
  }
}

export const db = new Database();
