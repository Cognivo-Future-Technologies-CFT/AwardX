export type CaseStudyStat = { value: string; label: string };

export type CaseStudyCompetitor = {
  player: string;
  positioning: string;
  strengths: string;
  likelyGap: string;
};

export type UnmetNeedScenario = {
  title: string;
  tag: string;
  description: string;
  requirements: string[];
};

export type GapItem = {
  title: string;
  body: string;
};

export type CaseStudySection = {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  gapItems?: GapItem[];
  scenarios?: UnmetNeedScenario[];
  competitors?: CaseStudyCompetitor[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  subtitle: string;
  industry: string;
  color: string;
  publishedAt: string;
  readTime: string;
  description: string;
  quote: string;
  author: string;
  authorRole: string;
  authorLinks: { label: string; href: string }[];
  stats: CaseStudyStat[];
  sections: CaseStudySection[];
};

export const CASE_STUDY_SLUG = 'award-management-market-gaps';

export const marketResearchCaseStudy: CaseStudy = {
  slug: CASE_STUDY_SLUG,
  title: 'Award Management Software Market Gaps and Growth Opportunity',
  subtitle: 'An industry analysis of fragmentation, unmet buyer needs, and competitive positioning in the awards workflow category.',
  industry: 'Market Research · AwardX',
  color: 'from-violet-800 via-indigo-800 to-slate-900',
  publishedAt: '2026-01-01',
  readTime: '18 min read',
  description:
    'The award management software market is a specialized but growing segment of workflow software used to manage nominations, submissions, reviews, judging, communications, scoring, winner selection, and reporting for awards, scholarships, grant-based awards, employee recognition programs, and industry recognition initiatives.',
  quote:
    'From a stakeholder perspective, the most promising growth opportunities lie in platforms that combine enterprise-grade workflow control with ease of implementation, enhanced fairness and auditability features, improved localization, and deeper ecosystem integration.',
  author: 'Guntoju Revant',
  authorRole: 'Prepared for AwardX · Cognivo',
  authorLinks: [
    { label: 'awardx.one', href: 'https://www.awardx.one' },
    { label: 'cognivo.one', href: 'https://www.cognivo.one' },
  ],
  stats: [
    { value: '$740.9M–$2.5B', label: 'Market size (2024–2025)' },
    { value: '7.2%–13.6%', label: 'Projected CAGR' },
    { value: '65%+', label: 'Cloud-based share (2024)' },
    { value: 'APAC', label: 'Fastest-growing region' },
  ],
  sections: [
    {
      id: 'executive-summary',
      heading: 'Executive Summary',
      paragraphs: [
        'Recent market reports estimate the market size to be between approximately USD 740.9 million and USD 2.5 billion in 2024–2025, with projected growth rates ranging from roughly 7.2% to 13.6% CAGR, depending on the scope and methodology used. This indicates strong growth potential while also highlighting fragmentation in how the market category is defined.',
        'The market\'s growth is being driven by cloud adoption, automation, AI-assisted evaluation, mobile accessibility, advanced analytics, and increasing compliance requirements related to privacy and fairness. At the same time, the industry continues to face several challenges. Many platforms are designed primarily for grants management or generic submission workflows rather than dedicated award programs. Multilingual and cross-border workflow capabilities remain limited, transparent bias-control mechanisms are often lacking, and integration with HR, CRM, identity management, and analytics systems is frequently insufficient for enterprise-level buyers.',
        'A solution that effectively addresses these gaps can differentiate itself in a market where established competitors often focus on feature breadth but do not always excel in usability, specialization, or trust.',
      ],
    },
    {
      id: 'industry-overview',
      heading: 'Industry Overview',
      paragraphs: [
        'Award management software is used by organizations that manage recurring or high-volume award programs and need to automate the entire process, from application intake to the final announcement. Core functionalities typically include application forms, nomination management, file uploads, eligibility verification, judge assignment, review scoring, communication templates, calendars, reporting dashboards, and, in some cases, payment processing, certificate generation, and public-facing showcase pages.',
        'The user base is broader than it may initially appear. It includes corporate HR and employer branding teams, academic institutions, foundations, nonprofit organizations, government agencies, event organizers, and industry associations. Cloud-based platforms are generally preferred because they offer greater scalability and support remote judging and distributed participation. According to the attached report, cloud-based solutions accounted for more than 65% of the market in 2024, while corporate employee recognition represented the largest application segment.',
        'Typical buyers are primarily mid-sized and large organizations that conduct recurring award cycles. However, smaller organizations and programs also adopt software as a service (SaaS) solution when they require greater speed, efficiency, and affordability. OpenWater\'s review of the market highlights several operational challenges, including late submissions, large file uploads, judge coordination, and incomplete application instructions. Consequently, many organizations purchase these platforms to replace manual, email-and-spreadsheet-based workflows.',
      ],
    },
    {
      id: 'market-trends',
      heading: 'Market Trends and Growth',
      paragraphs: [
        'The strongest trend across the award management software category is the shift toward cloud-native, SaaS-based platforms, as organizations seek greater scalability, lower upfront costs, and easier deployment. The attached report identifies cloud-native platforms, API-driven integration, and real-time accessibility as major growth drivers. Another recent market report also highlights the increasing demand for mobile, AI-enabled, and compliance-focused award management workflows.',
        'AI is emerging as a key differentiator, although its current applications are primarily limited to nomination triage, scoring assistance, analytics, and personalized communication rather than fully autonomous judging. The market report explicitly states that AI and machine learning are being used to automate nomination processing, improve decision-making accuracy, and personalize recognition experiences. However, it also emphasizes concerns regarding algorithmic bias and ethical risks.',
        'Market growth is further supported by broader organizational trends. Employee engagement and retention have become strategic priorities, while environmental, social, and governance (ESG) and corporate social responsibility (CSR) reporting have increased the demand for social-impact award programs. In addition, digital transformation has made remote judging and self-service participation more widely accepted. Market reports consistently identify North America and Europe as the current market leaders, whereas the Asia-Pacific region is expected to experience the fastest growth due to increasing digitization, mobile-first adoption, and rising demand for local-language support.',
        'One useful way to interpret these findings is that the market is expanding but has not yet become fully standardized. Different reports use varying definitions of "award management software," meaning that platforms serving employee recognition, scholarship management, and industry awards may be classified differently across studies. This fragmentation represents an opportunity for vendors to establish a clearly defined product category and develop stronger market positioning.',
      ],
    },
    {
      id: 'market-gaps',
      heading: 'Market Gaps and Unmet Needs',
      paragraphs: [
        'The most significant gap in the market is that many products are not specifically designed for award management programs. OpenWater\'s comparison indicates that Submittable is primarily focused on grants management, while Wizehive has shifted its focus away from award management. This suggests a common industry challenge: many vendors support award programs as a secondary use case rather than making them a core component of their product strategy.',
      ],
      gapItems: [
        {
          title: 'Fairness and transparency',
          body: 'The attached report highlights concerns regarding AI bias, excessive gamification, and the need for comprehensive audit trails. However, many platforms still fail to provide robust bias mitigation mechanisms, explainable scoring models, or transparent review traceability that stakeholders can trust. In sensitive award contexts, particularly HR recognition programs and public-sector awards, this lack of transparency represents a significant barrier to adoption.',
        },
        {
          title: 'Localization and cross-border readiness',
          body: 'The report repeatedly emphasizes data residency, the General Data Protection Regulation (GDPR), regional privacy regulations, language localization, and cultural considerations, particularly in the Asia-Pacific region and Europe. Nevertheless, many global platforms continue to rely on one-size-fits-all workflows that are not well suited for multilingual judging, local regulatory compliance, and region-specific data hosting requirements.',
        },
        {
          title: 'Integration depth',
          body: 'Buyers increasingly expect award management platforms to integrate seamlessly with HRIS, identity management systems, payroll, CRM, email services, analytics platforms, and collaboration tools. However, many solutions still offer only limited integrations or depend on manual workarounds. As a result, organizations incur hidden labor costs, making it more difficult to demonstrate a strong return on investment (ROI) to enterprise stakeholders.',
        },
        {
          title: 'Affordable pricing and ease of implementation',
          body: 'Evalato\'s positioning as a cost-effective and user-friendly platform demonstrates demand for lightweight deployments. However, the market still lacks enough polished mid-market solutions that successfully balance affordability with enterprise-grade workflow automation, reporting capabilities, and regulatory compliance.',
        },
      ],
    },
    {
      id: 'unmet-needs',
      heading: 'Specific Examples of Unmet Needs',
      paragraphs: [
        'The following buyer scenarios illustrate where incumbent platforms most frequently fall short — drawn directly from field research across higher education, enterprise HR, and public-sector programs.',
      ],
      scenarios: [
        {
          tag: 'Higher Education',
          title: 'Global scholarship awards',
          description:
            'A university managing global scholarship awards that requires multilingual application forms, reviewer locality controls, and region-specific data storage.',
          requirements: [
            'Multilingual application forms',
            'Reviewer locality controls',
            'Region-specific data storage',
          ],
        },
        {
          tag: 'Enterprise HR',
          title: 'Multinational employee recognition',
          description:
            'A multinational company operating employee recognition programs that requires HRIS integration, AI bias detection, and multilingual peer nomination workflows.',
          requirements: [
            'HRIS integration',
            'AI bias detection',
            'Multilingual peer nomination workflows',
          ],
        },
        {
          tag: 'Public Sector & Nonprofit',
          title: 'Government and civic award programs',
          description:
            'A government agency or nonprofit organization administering award programs that requires transparent audit logs, document retention capabilities, and public-facing reporting without the need for complex custom development.',
          requirements: [
            'Transparent audit logs',
            'Document retention capabilities',
            'Public-facing reporting without complex custom development',
          ],
        },
      ],
    },
    {
      id: 'competitive-landscape',
      heading: 'Competitive Landscape',
      paragraphs: [
        'The competitive landscape is led by a combination of specialized award management vendors and broader submission platforms that also support award programs. The attached report identifies SAP, Award Force, Submittable, WizeHive, OpenWater, and Award Track as key market players. Recent public comparisons also highlight Evalato, SurveyMonkey Apply, Judgify, AwardStage, Reviewr, and Submit as notable competitors.',
      ],
      competitors: [
        {
          player: 'OpenWater',
          positioning: 'Specialist in awards management',
          strengths: 'Broad feature set, strong security reputation, mature client base',
          likelyGap: 'Can still feel heavyweight for smaller buyers',
        },
        {
          player: 'Award Force',
          positioning: 'Specialist awards platform',
          strengths: 'International awards focus, customization, secure workflows',
          likelyGap: 'Less visible outside its niche',
        },
        {
          player: 'Submittable',
          positioning: 'Broader submissions platform',
          strengths: 'Polished UI, flexible workflow, enterprise reach',
          likelyGap: 'Grants-first orientation can weaken awards specialization',
        },
        {
          player: 'WizeHive',
          positioning: 'Broader grants/workflow platform',
          strengths: 'Workflow flexibility, enterprise presence',
          likelyGap: 'Awards are not the main priority',
        },
        {
          player: 'Evalato',
          positioning: 'Lightweight awards platform',
          strengths: 'Affordable, simple, easy to adopt',
          likelyGap: 'Less deep for complex enterprise needs',
        },
        {
          player: 'SAP Recognition Cloud',
          positioning: 'Enterprise ecosystem play',
          strengths: 'Fits existing SAP customers and enterprise workflows',
          likelyGap: 'Not a pure-play awards specialist',
        },
      ],
    },
  ],
};

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  if (slug === marketResearchCaseStudy.slug) return marketResearchCaseStudy;
  return undefined;
}
