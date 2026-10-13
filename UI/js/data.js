/**
 * ==========================================================================
 * DATA REPOSITORY
 * Edit this file when changing:
 * - Practice categories & questions (Grammar, Vocabulary, Listening, Writing)
 * - Speaking test topics & prompts (24 topics)
 * ==========================================================================
 */

// 1. PRACTICE ARENA DATA (4 CATEGORIES WITH BIG THUMBS & SUBTOPICS)
const practiceData = {
    grammar: {
        id: 'grammar',
        title: 'Grammar Lessons',
        emoji: '📐',
        badge: 'Band 7+ Focus',
        chipLabel: '📐 Grammar Drill',
        subtopics: [
            {
                id: 'conditionals',
                title: 'Tenses & Hypothetical Conditionals',
                desc: 'Third & Mixed Conditionals for complex scenario answers.',
                question: 'Describe a situation where a past decision changed your life. How would things be different if you had chosen otherwise?',
                hint: 'Aim to use: "If I hadn\'t chosen...", "I would currently be...", "Had I known..."'
            },
            {
                id: 'passive_inversion',
                title: 'Passive Voice & Inversion Structures',
                desc: 'Elevate formal IELTS speaking with academic sentence structures.',
                question: 'Should public transport be completely subsidized by governments? Give your perspective.',
                hint: 'Aim to use: "Not only is it argued that...", "It has been demonstrated that...", "Seldom do we see..."'
            },
            {
                id: 'connectors',
                title: 'Complex Sentence Connectors & Concessions',
                desc: 'Smooth transitions: although, nonetheless, whereas, in spite of.',
                question: 'Compare urban life with rural life in your country. Which one provides better well-being?',
                hint: 'Aim to use: "Whereas urban centers offer...", "Despite the high pace of life...", "Consequently..."'
            },
            {
                id: 'modals_speculation',
                title: 'Modals of Deduction & Speculation',
                desc: 'Must have been, might lead to, could potentially signify.',
                question: 'How do you think artificial intelligence will transform education over the next two decades?',
                hint: 'Aim to use: "It could plausibly replace...", "Students might no longer need to...", "This must inevitably lead to..."'
            }
        ]
    },
    vocabulary: {
        id: 'vocabulary',
        title: 'Vocabulary Lessons',
        emoji: '📚',
        badge: 'Lexical Boost',
        chipLabel: '📚 Lexical Drill',
        subtopics: [
            {
                id: 'environment_collocations',
                title: 'Environment & Sustainability Collocations',
                desc: 'High-band collocations: renewable energy, biodiversity loss, carbon footprint.',
                question: 'Describe an eco-friendly habit you practice regularly and its impact.',
                hint: 'Target vocabulary: "single-use plastics", "depletion of resources", "sustainable alternatives", "circular economy".'
            },
            {
                id: 'idiomatic_phrasing',
                title: 'Natural Idioms & Phrasal Verbs',
                desc: 'Sound native without overusing forced expressions.',
                question: 'Talk about a challenging project or goal you worked hard to achieve.',
                hint: 'Target idioms: "burn the midnight oil", "come up against a brick wall", "in the long run", "bear fruit".'
            },
            {
                id: 'work_technology',
                title: 'Workplace & Advanced Technology Phrasing',
                desc: 'Cutting-edge lexical resources for modern employment & digital tools.',
                question: 'How has remote working impacted professional collaboration in recent times?',
                hint: 'Target vocabulary: "streamline workflows", "telecommuting", "digital nomadism", "hybrid arrangements".'
            },
            {
                id: 'culture_traditions',
                title: 'Culture, Heritage & Traditions',
                desc: 'Nuanced adjectives and heritage descriptors.',
                question: 'Describe a traditional festival or celebration in your culture.',
                hint: 'Target vocabulary: "deeply ingrained", "festive atmosphere", "passed down through generations", "cultural heritage".'
            }
        ]
    },
    listening: {
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
        ]
    },
    writing: {
        id: 'writing',
        title: 'Writing Lessons',
        emoji: '✍️',
        badge: 'Task 1 & 2',
        chipLabel: '✍️ Writing Drill',
        subtopics: [
            {
                id: 'task2_intro',
                title: 'Task 2: Essay Introduction & Clear Thesis',
                desc: 'Paraphrase prompts and present an unequivocal roadmap in 3 sentences.',
                question: 'Topic: "Some believe technology increases isolation, while others argue it connects communities." Write your introductory paragraph.',
                hint: 'Formula: General context paraphrase + Concession clause + Direct thesis statement.'
            },
            {
                id: 'cohesion_paragraphs',
                title: 'Body Paragraph Cohesion & Topic Sentences',
                desc: 'P.E.E.L method: Point, Explanation, Example, Link back to topic.',
                question: 'Write a body paragraph arguing why arts education deserves equal funding in secondary schools.',
                hint: 'Ensure your topic sentence states the main idea before providing real-world illustrations.'
            },
            {
                id: 'task1_overview',
                title: 'Task 1: The Essential Overview Paragraph',
                desc: 'Summarizing key trends, peaks, troughs, and exceptions without listing raw data.',
                question: 'Draft an overview for a line graph showing carbon emissions across four European nations from 1990 to 2020.',
                hint: 'Key phrasing: "Overall, it is evident that...", "While nation A witnessed a steady ascent, nation B experienced a decline...".'
            },
            {
                id: 'counterarguments',
                title: 'Counterarguments & Decisive Rebuttals',
                desc: 'Demonstrate band 8+ critical thinking by neutralizing opposing views.',
                question: 'Address the opposing view that space exploration is a waste of financial resources.',
                hint: 'Structure: "Advocates of resource austerity argue that... Nonetheless, this overlooks the spin-off technologies that..."'
            }
        ]
    }
};

// 2. SPEAKING TEST TOPIC DATA (24 TOPICS)
const topics = [
    { name: 'Hometown', emoji: '🏠', difficulty: 'easy', prompt: 'Describe your hometown.' },
    { name: 'Work/Study', emoji: '💼', difficulty: 'medium', prompt: 'Describe your job or studies.' },
    { name: 'Hobbies', emoji: '🎨', difficulty: 'easy', prompt: 'Describe a hobby you enjoy.' },
    { name: 'Travel', emoji: '✈️', difficulty: 'medium', prompt: 'Describe a memorable journey.' },
    { name: 'Technology', emoji: '💻', difficulty: 'hard', prompt: 'Describe a piece of technology you use daily.' },
    { name: 'Environment', emoji: '🌍', difficulty: 'hard', prompt: 'Describe a way you help the environment.' },
    { name: 'Agriculture', emoji: '🌾', difficulty: 'medium', prompt: 'Describe a farming practice you know.' },
    { name: 'Education', emoji: '📚', difficulty: 'easy', prompt: 'Describe a teacher who influenced you.' },
    { name: 'Culture', emoji: '🎭', difficulty: 'medium', prompt: 'Describe a cultural tradition in your country.' },
    { name: 'Sports', emoji: '⚽', difficulty: 'easy', prompt: 'Describe a sport you enjoy watching or playing.' },
    { name: 'Food', emoji: '🍜', difficulty: 'easy', prompt: 'Describe a traditional dish from your country.' },
    { name: 'Health', emoji: '🏥', difficulty: 'medium', prompt: 'Describe a healthy habit you have.' },
    { name: 'Music', emoji: '🎵', difficulty: 'easy', prompt: 'Describe a song that means a lot to you.' },
    { name: 'Books', emoji: '📖', difficulty: 'medium', prompt: 'Describe a book that changed your perspective.' },
    { name: 'Movies', emoji: '🎬', difficulty: 'easy', prompt: 'Describe a movie you recently enjoyed.' },
    { name: 'Weather', emoji: '🌤️', difficulty: 'easy', prompt: 'Describe your favourite type of weather.' },
    { name: 'Transport', emoji: '🚌', difficulty: 'medium', prompt: 'Describe how you usually travel to work or school.' },
    { name: 'Shopping', emoji: '🛍️', difficulty: 'easy', prompt: 'Describe a memorable shopping experience.' },
    { name: 'Family', emoji: '👨👩👧', difficulty: 'easy', prompt: 'Describe a family member you admire.' },
    { name: 'Friendship', emoji: '🤝', difficulty: 'medium', prompt: 'Describe a close friend and why they matter.' },
    { name: 'City Life', emoji: '🏙️', difficulty: 'medium', prompt: 'Describe what you like about city life.' },
    { name: 'Rural Life', emoji: '🌻', difficulty: 'hard', prompt: 'Describe the advantages of living in the countryside.' },
    { name: 'Volunteering', emoji: '🤲', difficulty: 'hard', prompt: 'Describe a volunteering experience you had.' },
    { name: 'Future Plans', emoji: '🌟', difficulty: 'medium', prompt: 'Describe a goal you want to achieve in the future.' }
];

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
