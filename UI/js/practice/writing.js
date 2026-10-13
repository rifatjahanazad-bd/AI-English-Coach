/**
 * ==========================================================================
 * PRACTICE MODULE 4: WRITING LESSONS
 * Edit this file to customize:
 * - Writing subtopics (Task 2 intros, PEEL body paragraphs, Task 1 overviews, counterarguments)
 * - Questions, formulas, thesis statements & coherence feedback
 * ==========================================================================
 */

const writingPracticeModule = {
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
    ],

    // Specific AI feedback breakdown for Writing
    generateFeedback(subIdx, userText) {
        const sub = this.subtopics[subIdx] || this.subtopics[0];
        return {
            bandScore: '7.5',
            criteriaLabel: 'Task Achievement & Coherence & Cohesion',
            strengths: [
                `Clear logical development fitting the "${sub.title}" framework`,
                'Smooth discourse progression using varied transitional phrases',
                'Unambiguous position maintained throughout the response'
            ],
            recommendations: [
                { wrong: 'In conclusion, I think', correct: 'In final analysis, the preponderance of evidence indicates', note: 'Higher band conclusion' },
                { wrong: 'Firstly... Secondly...', correct: 'Primary among these considerations is... Coupled with this...', note: 'Varied cohesive ties' }
            ],
            proTip: 'In Task 2, dedicate sentence 1 strictly to paraphrasing the debate and sentence 2 to your unequivocal stance.'
        };
    }
};

// Register in global practice registry
window.writingPracticeModule = writingPracticeModule;
