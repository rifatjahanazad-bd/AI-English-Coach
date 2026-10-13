/**
 * ==========================================================================
 * PRACTICE MODULE 3: LISTENING TESTS
 * Edit this file to customize:
 * - Listening comprehension subtopics (connected speech, numbers/maps, stance, lectures)
 * - Questions, audio cues, note-taking prompts & listening feedback
 * ==========================================================================
 */

const listeningPracticeModule = {
    id: 'listening',
    title: 'Listening Tests',
    emoji: '🎧',
    badge: 'Audio Drills',
    chipLabel: '🎧 Listening Drill',
    subtopics: [
        {
            id: 'connected_speech',
            title: 'Connected Speech & Fast Native Accents',
            desc: 'Catching elision, assimilation, and weak forms in conversation.',
            question: 'Listen to the conversational prompt and summarize the speaker\'s central objection.',
            hint: 'Focus on identifying transition signals: "mind you", "to be honest", "on the flip side".'
        },
        {
            id: 'numbers_names',
            title: 'Detailed Data, Numbers & Map Navigation',
            desc: 'Precision listening for IELTS Section 1 & Section 2 test formats.',
            question: 'Identify key dates, venue names, and directional instructions mentioned in the prompt.',
            hint: 'Listen carefully for corrections: e.g. "Actually, make that the 15th, not the 14th".'
        },
        {
            id: 'speaker_attitudes',
            title: 'Detecting Speaker Stance & Implied Meaning',
            desc: 'Understanding tone, sarcasm, reluctance, and unspoken consent.',
            question: 'What is the speaker\'s underlying attitude toward the proposed educational reforms?',
            hint: 'Differentiate between enthusiastic agreement versus cautious skepticism.'
        },
        {
            id: 'lecture_notes',
            title: 'Academic Lecture Keynote Summarization',
            desc: 'Extracting main thesis, supporting evidence, and concluding takeaways.',
            question: 'Note down three key arguments presented regarding urban climate resilience.',
            hint: 'Synthesize the arguments concisely using bullet points or structured sentences.'
        }
    ],

    // Specific AI feedback breakdown for Listening
    generateFeedback(subIdx, userText) {
        const sub = this.subtopics[subIdx] || this.subtopics[0];
        return {
            bandScore: '7.5',
            criteriaLabel: 'Comprehension Accuracy & Information Extraction',
            strengths: [
                `Captured core nuances of "${sub.title}"`,
                'Accurately extracted specific factual points without distortion',
                'Demonstrated strong awareness of speaker discourse markers'
            ],
            recommendations: [
                { wrong: 'The speaker agreed fully', correct: 'The speaker conceded the point with mild reservations', note: 'Nuanced attitude' },
                { wrong: 'He said 14th', correct: 'He corrected to the 15th', note: 'Distractor detection' }
            ],
            proTip: 'Always listen for pivot words ("however", "conversely", "actually") that signal a change of mind or key qualification.'
        };
    }
};

// Register in global practice registry
window.listeningPracticeModule = listeningPracticeModule;
