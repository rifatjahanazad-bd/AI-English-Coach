/**
 * ==========================================================================
 * PRACTICE MODULE 2: VOCABULARY LESSONS
 * Edit this file to customize:
 * - Vocabulary subtopics (environment, idioms, workplace tech, culture)
 * - Questions, target collocations & lexical resource feedback rules
 * ==========================================================================
 */

const vocabularyPracticeModule = {
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
    ],

    // Specific AI feedback breakdown for Vocabulary
    generateFeedback(subIdx, userText) {
        const sub = this.subtopics[subIdx] || this.subtopics[0];
        return {
            bandScore: '8.0',
            criteriaLabel: 'Lexical Resource & Collocation Precision',
            strengths: [
                `Naturally incorporated targeted collocations for "${sub.title}"`,
                'Demonstrated precise word choice with minimal repetition',
                'Avoided over-used generic clichés'
            ],
            recommendations: [
                { wrong: 'big problem for nature', correct: 'pressing ecological dilemma', note: 'Sophisticated phrasing' },
                { wrong: 'I worked very hard', correct: 'I poured tremendous diligence into', note: 'Rich idiomatic expression' }
            ],
            proTip: 'Group vocabulary in semantic topic clusters (verb + noun collocations) to speak spontaneously without hesitation.'
        };
    }
};

// Register in global practice registry
window.vocabularyPracticeModule = vocabularyPracticeModule;
