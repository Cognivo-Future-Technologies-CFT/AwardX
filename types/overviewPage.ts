export interface ThemeSettings {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    backgroundColor: string;
    backgroundImageUrl?: string;
    sectionSpacing: 'compact' | 'medium' | 'spacious';
}

export interface PageConfig {
    id: string;
    programId: string;
    themeSettings: ThemeSettings;
    isPublished: boolean;
    publishedAt?: string;
    publishedVersion: number;
    seoTitle?: string;
    seoDescription?: string;
    createdAt: string;
    updatedAt: string;
}

export type SectionType =
    | 'hero'
    | 'about'
    | 'highlights'
    | 'categories'
    | 'process'
    | 'eligibility'
    | 'timeline'
    | 'jury'
    | 'past_editions'
    | 'sponsors'
    | 'faq'
    | 'cta'
    | 'custom';

export interface PageSection {
    id: string;
    programId: string;
    sectionType: SectionType;
    title?: string;
    subtitle?: string;
    content: Record<string, any>;
    settings: Record<string, any>;
    sortOrder: number;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Sponsor {
    id: string;
    programId: string;
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
    tier: 'title' | 'powered_by' | 'gold' | 'silver' | 'media' | 'community' | 'partner';
    tierLabel?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
}

export interface FAQ {
    id: string;
    programId: string;
    question: string;
    answer: string;
    category: string;
    sortOrder: number;
    isVisible: boolean;
    createdAt: string;
}

export interface TimelineMilestone {
    id: string;
    programId: string;
    title: string;
    date: string;
    description?: string;
    icon?: string;
    sortOrder: number;
    isVisible: boolean;
    createdAt: string;
}
