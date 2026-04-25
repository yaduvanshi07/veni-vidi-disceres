const Analytics = require('../models/Analytics');
const StudySession = require('../models/StudySession');
const QuestionTrend = require('../models/QuestionTrend');
const Document = require('../models/Document');

// Track study session
async function trackStudySession(userId, documentId, courseId, subject, topic, startTime, endTime) {
  try {
    const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
    
    const session = new StudySession({
      userId,
      documentId,
      courseId,
      subject,
      topic,
      startTime,
      endTime,
      duration
    });
    
    await session.save();
    
    // Update document study time
    if (documentId) {
      await Document.findByIdAndUpdate(documentId, {
        $inc: { studyTime: duration },
        lastViewed: endTime,
        $inc: { viewCount: 1 }
      });
    }
    
    // Update daily analytics
    await updateDailyAnalytics(userId, subject, topic, duration);
    
    return session;
  } catch (error) {
    console.error('Error tracking study session:', error);
    throw error;
  }
}

// Update daily analytics
async function updateDailyAnalytics(userId, subject, topic, duration) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await Analytics.findOne({
    userId,
    date: { $gte: today }
  });
  
  if (!analytics) {
    analytics = new Analytics({
      userId,
      date: today,
      studyTime: 0,
      documentsViewed: 0,
      questionsAsked: 0
    });
  }
  
  analytics.studyTime += duration;
  
  // Update subject time
  const subjectIndex = analytics.subjects.findIndex(s => s.subject === subject);
  if (subjectIndex >= 0) {
    analytics.subjects[subjectIndex].timeSpent += duration;
  } else {
    analytics.subjects.push({ subject, timeSpent: duration });
  }
  
  // Update topic time
  if (topic) {
    const topicIndex = analytics.topics.findIndex(t => t.topic === topic);
    if (topicIndex >= 0) {
      analytics.topics[topicIndex].timeSpent += duration;
    } else {
      analytics.topics.push({ topic, timeSpent: duration, difficulty: 'Medium' });
    }
  }
  
  await analytics.save();
}

// Track question asked
async function trackQuestion(userId, question, documentId, topic, subject) {
  try {
    let trend = await QuestionTrend.findOne({
      userId,
      question: { $regex: new RegExp(question, 'i') }
    });
    
    if (trend) {
      trend.frequency += 1;
      trend.lastAsked = new Date();
      if (documentId) trend.documentId = documentId;
      if (topic) trend.topic = topic;
      if (subject) trend.subject = subject;
    } else {
      trend = new QuestionTrend({
        userId,
        question,
        documentId,
        topic,
        subject,
        frequency: 1
      });
    }
    
    await trend.save();
    
    // Update analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let analytics = await Analytics.findOne({
      userId,
      date: { $gte: today }
    });
    
    if (analytics) {
      analytics.questionsAsked += 1;
      await analytics.save();
    }
  } catch (error) {
    console.error('Error tracking question:', error);
  }
}

// Get study patterns
async function getStudyPatterns(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sessions = await StudySession.find({
      userId,
      startTime: { $gte: startDate }
    }).sort({ startTime: -1 });
    
    // Group by day
    const dailyPattern = {};
    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      if (!dailyPattern[date]) {
        dailyPattern[date] = { date, duration: 0, sessions: 0 };
      }
      dailyPattern[date].duration += session.duration || 0;
      dailyPattern[date].sessions += 1;
    });
    
    // Group by subject
    const subjectPattern = {};
    sessions.forEach(session => {
      const subject = session.subject || 'Unknown';
      if (!subjectPattern[subject]) {
        subjectPattern[subject] = { duration: 0, sessions: 0 };
      }
      subjectPattern[subject].duration += session.duration || 0;
      subjectPattern[subject].sessions += 1;
    });
    
    return {
      dailyPattern: Object.values(dailyPattern),
      subjectPattern,
      totalSessions: sessions.length,
      totalTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    };
  } catch (error) {
    console.error('Error getting study patterns:', error);
    throw error;
  }
}

// Identify weak topics
async function identifyWeakTopics(userId) {
  try {
    const analytics = await Analytics.find({ userId })
      .sort({ date: -1 })
      .limit(30);
    
    const topicPerformance = {};
    
    analytics.forEach(anal => {
      anal.topics.forEach(topic => {
        if (!topicPerformance[topic.topic]) {
          topicPerformance[topic.topic] = {
            totalTime: 0,
            count: 0,
            difficulty: topic.difficulty
          };
        }
        topicPerformance[topic.topic].totalTime += topic.timeSpent || 0;
        topicPerformance[topic.topic].count += 1;
      });
    });
    
    // Calculate average time per topic
    const topics = Object.entries(topicPerformance).map(([topic, data]) => ({
      topic,
      averageTime: data.totalTime / data.count,
      difficulty: data.difficulty,
      count: data.count
    }));
    
    // Identify weak topics (low time spent, hard difficulty)
    const weakTopics = topics
      .filter(t => t.difficulty === 'Hard' || t.averageTime < 30)
      .sort((a, b) => a.averageTime - b.averageTime)
      .slice(0, 10);
    
    return weakTopics;
  } catch (error) {
    console.error('Error identifying weak topics:', error);
    throw error;
  }
}

// Get frequently asked questions
async function getFrequentlyAskedQuestions(userId, limit = 10) {
  try {
    const trends = await QuestionTrend.find({ userId })
      .sort({ frequency: -1, lastAsked: -1 })
      .limit(limit);
    
    return trends;
  } catch (error) {
    console.error('Error getting FAQ trends:', error);
    throw error;
  }
}

// Predict performance
async function predictPerformance(userId) {
  try {
    const patterns = await getStudyPatterns(userId, 30);
    const weakTopics = await identifyWeakTopics(userId);
    
    // Simple performance prediction algorithm
    const studyConsistency = patterns.dailyPattern.length / 30;
    const totalStudyTime = patterns.totalTime;
    const weakTopicsCount = weakTopics.length;
    
    let performanceScore = 50; // Base score
    
    // Increase based on consistency
    performanceScore += studyConsistency * 20;
    
    // Increase based on total study time
    performanceScore += Math.min(totalStudyTime / 10, 20);
    
    // Decrease based on weak topics
    performanceScore -= weakTopicsCount * 2;
    
    // Clamp between 0 and 100
    performanceScore = Math.max(0, Math.min(100, performanceScore));
    
    return {
      score: Math.round(performanceScore),
      factors: {
        consistency: Math.round(studyConsistency * 100),
        totalStudyTime,
        weakTopicsCount
      }
    };
  } catch (error) {
    console.error('Error predicting performance:', error);
    throw error;
  }
}

module.exports = {
  trackStudySession,
  trackQuestion,
  getStudyPatterns,
  identifyWeakTopics,
  getFrequentlyAskedQuestions,
  predictPerformance,
  updateDailyAnalytics
};

