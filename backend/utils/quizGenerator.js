const natural = require('natural');
const TfIdf = natural.TfIdf;
const PorterStemmer = natural.PorterStemmer;
const sentenceTokenizer = new natural.SentenceTokenizer();
const wordTokenizer = new natural.WordTokenizer();

// Comprehensive English stopwords list
const STOPWORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves', 'just', 'like', 'also', 'know', 'get', 'see', 'make', 'take', 'want', 'think', 'look', 'people', 'good', 'really', 'well', 'much', 'even', 'first', 'used'
]);

/**
 * Cleans text by removing common transcript noise and normalizing whitespace.
 */
function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/\[\w+\]/g, '') // Remove [music], [applause], etc.
        .replace(/\(\w+\)/g, '') // Remove (laughter), etc.
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
}

/**
 * Extracts top keywords from a text based on TF-IDF and POS considerations.
 */
function extractKeywords(text, count = 30) {
    const tfidf = new TfIdf();
    const cleanedText = cleanText(text);
    
    // Normalize and filter text for TF-IDF
    const tokens = wordTokenizer.tokenize(cleanedText)
        .map(w => w.toLowerCase())
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
    
    tfidf.addDocument(tokens.join(' '));
    
    const terms = [];
    tfidf.listTerms(0).forEach(item => {
        // High-scoring terms that are not stopwords
        if (!STOPWORDS.has(item.term)) {
            terms.push({ term: item.term, score: item.tfidf });
        }
    });

    return terms
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map(w => w.term);
}

/**
 * Scores a sentence context for its quality as a MCQ.
 */
function scoreSentence(sentence, keyword) {
    const lowerS = sentence.toLowerCase();
    let score = 0;

    // 1. Length scoring (prefer 60-150 chars)
    if (sentence.length >= 60 && sentence.length <= 150) score += 20;
    else if (sentence.length > 40 && sentence.length <= 250) score += 10;
    else return -100; // Too short or too long

    // 2. Keyword density (if keyword is in sentence)
    if (lowerS.includes(keyword.toLowerCase())) score += 15;
    else return -100;

    // 3. Definition/Explanation detection
    if (/\bis\b|\bare\b|\bmeans\b|\brefers to\b/i.test(lowerS)) score += 10;

    // 4. Complexity/Context penalty (pronouns at start often lack context)
    if (/^(he|she|they|it|this|that|these|those)\b/i.test(lowerS)) score -= 15;

    // 5. Ending punctuation (prefer full sentences)
    if (/[.!?]$/.test(sentence)) score += 5;

    return score;
}

/**
 * Generates MCQs from text based on keywords.
 */
function generateMCQs(text, numQuestions = 5) {
    const cleanedText = cleanText(text);
    const keywords = extractKeywords(cleanedText, 60);
    const sentences = sentenceTokenizer.tokenize(cleanedText);
    
    const questions = [];
    const usedSentences = new Set();
    const usedKeywords = new Set();

    // Group sentences by candidate quality for each keyword
    const candidates = [];

    for (const keyword of keywords) {
        if (usedKeywords.has(keyword)) continue;

        let bestSentence = null;
        let maxScore = -1;

        for (const s of sentences) {
            if (usedSentences.has(s)) continue;
            
            const score = scoreSentence(s, keyword);
            if (score > maxScore) {
                maxScore = score;
                bestSentence = s;
            }
        }

        if (bestSentence && maxScore > 0) {
            candidates.push({ keyword, sentence: bestSentence, score: maxScore });
        }
    }

    // Sort candidates by their quality score and take the best ones
    const topCandidates = candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, numQuestions * 2); // Get a larger pool first

    for (const cand of topCandidates) {
        if (questions.length >= numQuestions) break;
        if (usedSentences.has(cand.sentence)) continue;

        const { keyword, sentence } = cand;

        // Create distractors from other high-quality keywords
        const distractors = keywords
            .filter(kb => kb !== keyword && !sentence.toLowerCase().includes(kb.toLowerCase()))
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        if (distractors.length < 3) continue;

        // Create options and shuffle
        const options = [keyword, ...distractors].sort(() => 0.5 - Math.random());
        const correctAnswerIndex = options.indexOf(keyword);

        // Hide the keyword in the sentence using word boundary regex
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const questionText = sentence.replace(regex, "__________");

        // Ensure we actually replaced something
        if (questionText.indexOf("__________") === -1) continue;

        questions.push({
            questionText,
            options,
            correctAnswerIndex,
            topic: keyword,
            type: 'multiple-choice'
        });

        usedSentences.add(sentence);
        usedKeywords.add(keyword);
    }

    return questions;
}

module.exports = {
    extractKeywords,
    generateMCQs
};
