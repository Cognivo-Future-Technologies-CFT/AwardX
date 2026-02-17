import { EventType, Round } from './models';

export interface JudgingConfig {
    minReviewersPerEntry: number;
    idealReviewersPerEntry: number;
    totalJuryPoolSize: number;
    blindReview: boolean;
    scoreNormalization: boolean;
    scoringScale: '1-5' | '1-7' | '1-10' | 'pass-fail';
}

export interface RoundTemplate {
    title: string;
    type: 'Submission' | 'Judging' | 'Voting' | 'Announcement';
    description: string;
    /**
     * Days offset from program deadline (negative = before deadline)
     * e.g., -30 means 30 days before deadline
     */
    startOffsetDays: number;
    durationDays: number;
    reviewerCount?: number;
}

export interface TemplateConfig {
    eventType: EventType;
    judgingConfig: JudgingConfig;
    rounds: RoundTemplate[];
    totalRounds: { min: number; ideal: number };
}

/**
 * Get default round configuration for a given event template type
 * Based on peer-reviewed research and real-world award program data
 */
export function getTemplateConfig(eventType: EventType): TemplateConfig {
    switch (eventType) {
        case 'Award':
            return getAwardConfig();
        case 'Competition':
            return getCompetitionConfig();
        case 'Grant':
            return getGrantConfig();
        case 'Residency':
            return getResidencyConfig();
        case 'Commission':
            return getCommissionConfig();
        case 'Exhibition':
            return getExhibitionConfig();
        case 'Fair':
            return getFairConfig();
        case 'Internal Event':
            return getInternalEventConfig();
        case 'Other':
            return getGenericConfig();
        default:
            return getGenericConfig();
    }
}

/**
 * Award Template (e.g., A' Design Award, iF Design Award)
 * 3 rounds: Triage → Scoring → Final Deliberation
 * 3-5 reviewers per entry, jury pool 10-30
 */
function getAwardConfig(): TemplateConfig {
    return {
        eventType: 'Award',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 20,
            blindReview: true,
            scoreNormalization: true,
            scoringScale: '1-7',
        },
        totalRounds: { min: 2, ideal: 3 },
        rounds: [
            {
                title: 'Submission Period',
                type: 'Submission',
                description: 'Open call for entries. Participants submit their work for consideration.',
                startOffsetDays: -60, // 60 days before deadline
                durationDays: 60,
            },
            {
                title: 'Preliminary Triage',
                type: 'Judging',
                description: 'Fast eligibility and quality gate. Eliminate bottom ~50% of entries.',
                startOffsetDays: 0, // Starts at deadline
                durationDays: 7,
                reviewerCount: 3,
            },
            {
                title: 'Detailed Scoring',
                type: 'Judging',
                description: 'Rubric-based evaluation by 3-5 assigned reviewers per entry. Anonymous blind review.',
                startOffsetDays: 7,
                durationDays: 14,
                reviewerCount: 5,
            },
            {
                title: 'Final Jury Deliberation',
                type: 'Judging',
                description: 'Full jury meeting for shortlisted entries. Discussion-based consensus for top awards.',
                startOffsetDays: 21,
                durationDays: 7,
            },
            {
                title: 'Winner Announcement',
                type: 'Announcement',
                description: 'Public announcement of award winners and recognition.',
                startOffsetDays: 28,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Competition Template (e.g., TIC Americas, SND Creative Competition)
 * 4 rounds: Preliminary → Semi-Final → Final → Grand Final
 * 3-5 reviewers per entry, jury pool 15-40
 */
function getCompetitionConfig(): TemplateConfig {
    return {
        eventType: 'Competition',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 30,
            blindReview: true,
            scoreNormalization: true,
            scoringScale: '1-10',
        },
        totalRounds: { min: 3, ideal: 4 },
        rounds: [
            {
                title: 'Submission Period',
                type: 'Submission',
                description: 'Open submissions for competition entries.',
                startOffsetDays: -90,
                durationDays: 90,
            },
            {
                title: 'Preliminary Round',
                type: 'Judging',
                description: 'Eligibility check and initial scoring. Cut bottom ~60%.',
                startOffsetDays: 0,
                durationDays: 10,
                reviewerCount: 3,
            },
            {
                title: 'Semi-Final Round',
                type: 'Judging',
                description: 'Detailed rubric evaluation. 3-5 reviewers per entry. Advance top 20%.',
                startOffsetDays: 10,
                durationDays: 14,
                reviewerCount: 5,
            },
            {
                title: 'Final Round',
                type: 'Judging',
                description: 'Live presentations or deep review. Panel discussion and scoring.',
                startOffsetDays: 24,
                durationDays: 7,
            },
            {
                title: 'Grand Final & Awards',
                type: 'Announcement',
                description: 'Final winners announced. Optional public showcase or ceremony.',
                startOffsetDays: 31,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Grant Template (e.g., NIH, SSHRC, ERC)
 * 3 rounds: Outline Triage → Expert Panel → Ratification
 * 3-5 reviewers per entry, jury pool 15-30+
 */
function getGrantConfig(): TemplateConfig {
    return {
        eventType: 'Grant',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 25,
            blindReview: false, // Grants typically require applicant info
            scoreNormalization: true,
            scoringScale: '1-10',
        },
        totalRounds: { min: 2, ideal: 3 },
        rounds: [
            {
                title: 'Application Period',
                type: 'Submission',
                description: 'Grant applications and proposals open for submission.',
                startOffsetDays: -120,
                durationDays: 120,
            },
            {
                title: 'Outline Triage',
                type: 'Judging',
                description: 'External assessors review proposals. Min 2-3 per application. ~50% discussed further.',
                startOffsetDays: 0,
                durationDays: 21,
                reviewerCount: 3,
            },
            {
                title: 'Expert Panel Review',
                type: 'Judging',
                description: 'Full committee meeting. Assigned reviewers present critiques. Panel scores on 1-10 scale.',
                startOffsetDays: 21,
                durationDays: 14,
                reviewerCount: 5,
            },
            {
                title: 'Ratification & Ranking',
                type: 'Judging',
                description: 'Advisory body reviews ranked list. Final funding decisions.',
                startOffsetDays: 35,
                durationDays: 7,
            },
            {
                title: 'Award Notification',
                type: 'Announcement',
                description: 'Grant recipients notified and awards announced.',
                startOffsetDays: 42,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Residency Template (e.g., MacDowell, Yaddo, Skowhegan)
 * 3 rounds: Initial Jury → Panel Shortlist → Interviews
 * 3-5 reviewers per entry, jury pool 5-15
 */
function getResidencyConfig(): TemplateConfig {
    return {
        eventType: 'Residency',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 10,
            blindReview: true, // Anonymous review is standard for residencies
            scoreNormalization: true,
            scoringScale: '1-7',
        },
        totalRounds: { min: 2, ideal: 3 },
        rounds: [
            {
                title: 'Application Period',
                type: 'Submission',
                description: 'Artists submit applications for residency consideration.',
                startOffsetDays: -90,
                durationDays: 90,
            },
            {
                title: 'Initial Jury Scoring',
                type: 'Judging',
                description: 'Blind review. 3 jurors per application score independently based on work quality.',
                startOffsetDays: 0,
                durationDays: 14,
                reviewerCount: 3,
            },
            {
                title: 'Panel Shortlist',
                type: 'Judging',
                description: 'Full panel convenes to discuss top-scored applications. Consensus building.',
                startOffsetDays: 14,
                durationDays: 7,
            },
            {
                title: 'Finalist Interviews',
                type: 'Judging',
                description: 'Optional interviews with shortlisted candidates for competitive programs.',
                startOffsetDays: 21,
                durationDays: 7,
            },
            {
                title: 'Selection Announcement',
                type: 'Announcement',
                description: 'Selected artists notified and residency placements confirmed.',
                startOffsetDays: 28,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Commission Template (Public Art Programs, WDO)
 * 3 rounds: Proposal Triage → Detailed Scoring → Pitch/Decision
 * 3-5 reviewers per entry, jury pool 7-15
 */
function getCommissionConfig(): TemplateConfig {
    return {
        eventType: 'Commission',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 10,
            blindReview: false,
            scoreNormalization: true,
            scoringScale: '1-7',
        },
        totalRounds: { min: 3, ideal: 3 },
        rounds: [
            {
                title: 'RFQ Period',
                type: 'Submission',
                description: 'Request for Qualifications. Artists submit portfolios and credentials.',
                startOffsetDays: -60,
                durationDays: 30,
            },
            {
                title: 'Proposal Triage',
                type: 'Judging',
                description: 'Review qualifications and portfolios. Shortlist 3-5 finalists.',
                startOffsetDays: -30,
                durationDays: 14,
            },
            {
                title: 'RFP Period',
                type: 'Submission',
                description: 'Shortlisted artists submit full proposals.',
                startOffsetDays: -16,
                durationDays: 16,
            },
            {
                title: 'Detailed Scoring',
                type: 'Judging',
                description: 'Rubric-based evaluation on feasibility, merit, and budget.',
                startOffsetDays: 0,
                durationDays: 10,
                reviewerCount: 5,
            },
            {
                title: 'Pitch & Final Decision',
                type: 'Judging',
                description: 'Live presentations + Q&A. Panel votes on final selection.',
                startOffsetDays: 10,
                durationDays: 7,
            },
            {
                title: 'Artist Selection',
                type: 'Announcement',
                description: 'Commissioned artist announced and contract negotiations begin.',
                startOffsetDays: 17,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Exhibition Template (Venice Biennale, London Biennale, ZAPP)
 * 3 rounds: Fast Triage → Curatorial Scoring → Final Programming
 * 3-5 reviewers per entry, jury pool 5-20
 */
function getExhibitionConfig(): TemplateConfig {
    return {
        eventType: 'Exhibition',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 12,
            blindReview: true,
            scoreNormalization: true,
            scoringScale: '1-10',
        },
        totalRounds: { min: 2, ideal: 3 },
        rounds: [
            {
                title: 'Open Call',
                type: 'Submission',
                description: 'Artists submit work for exhibition consideration.',
                startOffsetDays: -60,
                durationDays: 60,
            },
            {
                title: 'Fast Triage',
                type: 'Judging',
                description: 'Digital review. Eligibility and basic quality gate. Cut ~40%.',
                startOffsetDays: 0,
                durationDays: 7,
            },
            {
                title: 'Curatorial Scoring',
                type: 'Judging',
                description: 'Full jury scores on rubric (1-10 scale). Discussion for borderline entries.',
                startOffsetDays: 7,
                durationDays: 14,
                reviewerCount: 5,
            },
            {
                title: 'Final Programming',
                type: 'Judging',
                description: 'Curatorial team assembles final exhibition from top-scored works.',
                startOffsetDays: 21,
                durationDays: 7,
            },
            {
                title: 'Artist Notification',
                type: 'Announcement',
                description: 'Selected artists notified and exhibition details finalized.',
                startOffsetDays: 28,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Fair Template (ZAPP Art Fairs)
 * 2 rounds: Eligibility → Curated Selection
 * 3-4 reviewers per entry, jury pool 5-12
 */
function getFairConfig(): TemplateConfig {
    return {
        eventType: 'Fair',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 4,
            totalJuryPoolSize: 8,
            blindReview: true,
            scoreNormalization: false,
            scoringScale: '1-7',
        },
        totalRounds: { min: 2, ideal: 2 },
        rounds: [
            {
                title: 'Application Period',
                type: 'Submission',
                description: 'Artists apply for booth space at the fair.',
                startOffsetDays: -45,
                durationDays: 45,
            },
            {
                title: 'Eligibility Review',
                type: 'Judging',
                description: 'Verify medium, check image quality. Score 1-7. Cut bottom 40%.',
                startOffsetDays: 0,
                durationDays: 7,
                reviewerCount: 3,
            },
            {
                title: 'Curated Selection',
                type: 'Judging',
                description: 'Final scoring 1-5. Balance medium mix and booth diversity.',
                startOffsetDays: 7,
                durationDays: 7,
                reviewerCount: 4,
            },
            {
                title: 'Booth Assignments',
                type: 'Announcement',
                description: 'Accepted artists notified and booth assignments made.',
                startOffsetDays: 14,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Internal Event Template (Corporate Awards, Hackathons)
 * 2 rounds: Single Scoring → Leadership Review
 * 3-4 reviewers per entry, jury pool 3-10
 */
function getInternalEventConfig(): TemplateConfig {
    return {
        eventType: 'Internal Event',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 4,
            totalJuryPoolSize: 6,
            blindReview: false,
            scoreNormalization: false,
            scoringScale: '1-5',
        },
        totalRounds: { min: 1, ideal: 2 },
        rounds: [
            {
                title: 'Submission Period',
                type: 'Submission',
                description: 'Team members submit entries for internal recognition.',
                startOffsetDays: -30,
                durationDays: 30,
            },
            {
                title: 'Committee Scoring',
                type: 'Judging',
                description: 'Committee scores all entries on simplified rubric.',
                startOffsetDays: 0,
                durationDays: 7,
                reviewerCount: 3,
            },
            {
                title: 'Leadership Review',
                type: 'Judging',
                description: 'Senior leaders ratify or adjust final selections.',
                startOffsetDays: 7,
                durationDays: 3,
            },
            {
                title: 'Award Ceremony',
                type: 'Announcement',
                description: 'Winners announced at internal event or ceremony.',
                startOffsetDays: 10,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Generic/Other Template
 * Fallback configuration for custom event types
 */
function getGenericConfig(): TemplateConfig {
    return {
        eventType: 'Other',
        judgingConfig: {
            minReviewersPerEntry: 3,
            idealReviewersPerEntry: 5,
            totalJuryPoolSize: 15,
            blindReview: true,
            scoreNormalization: true,
            scoringScale: '1-7',
        },
        totalRounds: { min: 2, ideal: 3 },
        rounds: [
            {
                title: 'Submission Period',
                type: 'Submission',
                description: 'Open submissions for entries.',
                startOffsetDays: -60,
                durationDays: 60,
            },
            {
                title: 'Initial Review',
                type: 'Judging',
                description: 'First round of evaluation and scoring.',
                startOffsetDays: 0,
                durationDays: 14,
                reviewerCount: 3,
            },
            {
                title: 'Final Review',
                type: 'Judging',
                description: 'Final evaluation and selection.',
                startOffsetDays: 14,
                durationDays: 7,
                reviewerCount: 5,
            },
            {
                title: 'Results Announcement',
                type: 'Announcement',
                description: 'Winners and results announced.',
                startOffsetDays: 21,
                durationDays: 1,
            },
        ],
    };
}

/**
 * Create actual Round objects from template configuration
 * @param programId - The program to create rounds for
 * @param eventType - The event template type
 * @param deadline - Program deadline date (used for calculating round dates)
 */
export function createRoundsFromTemplate(
    programId: string,
    eventType: EventType,
    deadline: string
): Round[] {
    const config = getTemplateConfig(eventType);
    const deadlineDate = new Date(deadline);

    return config.rounds.map((template, index) => {
        const startDate = new Date(deadlineDate);
        startDate.setDate(startDate.getDate() + template.startOffsetDays);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + template.durationDays);

        // Determine status based on current date
        const now = new Date();
        let status: 'Upcoming' | 'Active' | 'Completed';
        if (now < startDate) {
            status = 'Upcoming';
        } else if (now >= startDate && now <= endDate) {
            status = 'Active';
        } else {
            status = 'Completed';
        }

        return {
            id: `${programId}_round_${index + 1}_${Date.now()}`,
            programId,
            title: template.title,
            type: template.type,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status,
            description: template.description,
        };
    });
}
