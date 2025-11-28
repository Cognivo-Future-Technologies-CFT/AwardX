
export interface PaymentConfig {
  enabled: boolean;
  provider: 'Stripe' | 'PayPal' | 'Razorpay';
  currency: string;
  fee: number;
  publicKey?: string;
  connected: boolean;
}

export interface Program {
  id: string;
  title: string;
  category: string;
  status: 'Active' | 'Draft' | 'Completed';
  deadline: string;
  entriesCount: number;
  paymentConfig?: PaymentConfig;
}

export interface Submission {
  id: string;
  title: string;
  applicant: string;
  category: string;
  status: 'Pending' | 'Under Review' | 'Shortlisted' | 'Accepted' | 'Rejected';
  score: number | null;
  date: string;
  image: string;
}

export interface Judge {
  id: string;
  name: string;
  avatar: string;
  email: string;
  status: 'Active' | 'Invited' | 'Completed';
  progress: number;
  assignedCount: number;
  completedCount: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  role: 'Applicant' | 'Judge' | 'Team' | 'Admin';
  status: 'Active' | 'Inactive';
  lastActive: string;
  avatar: string;
  source: string;
  surveyAnswer: string;
  joinedDate: string;
}

export interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  content: string;
  time: string;
  unread: boolean;
  threadId: string;
}

export interface SocialAccount {
  id: string;
  platform: 'Twitter' | 'LinkedIn' | 'Instagram' | 'Facebook';
  handle: string;
  status: 'Connected' | 'Disconnected';
  avatar: string;
}

export interface ScheduledPost {
  id: string;
  content: string;
  image?: string;
  platforms: ('Twitter' | 'LinkedIn' | 'Instagram' | 'Facebook')[];
  scheduledFor: string;
  trigger: 'Manual' | 'Voting Open' | 'Half-time' | 'Winners';
  status: 'Scheduled' | 'Posted' | 'Draft';
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  usersCount: number;
  color: string;
}

export interface Log {
  id: string;
  action: string;
  user: string;
  userAvatar: string;
  details: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'warning';
}

class DemoDatabase {
  private PROGRAMS_KEY = 'nomify_demo_programs';
  private SUBMISSIONS_KEY = 'nomify_demo_submissions';
  private JUDGES_KEY = 'nomify_demo_judges';
  private CONTACTS_KEY = 'nomify_demo_contacts';
  private MESSAGES_KEY = 'nomify_demo_messages';
  private SOCIAL_KEY = 'nomify_demo_social';
  private POSTS_KEY = 'nomify_demo_posts';
  private ROLES_KEY = 'nomify_demo_roles';
  private LOGS_KEY = 'nomify_demo_logs';

  constructor() {
    this.seed();
  }

  private seed() {
    if (!localStorage.getItem(this.PROGRAMS_KEY)) {
      const initialPrograms: Program[] = [
        { 
          id: 'PROG-001', 
          title: 'Global Design Awards 2024', 
          category: 'Design', 
          status: 'Active', 
          deadline: '2024-12-31', 
          entriesCount: 124,
          paymentConfig: {
            enabled: true,
            provider: 'Stripe',
            currency: 'USD',
            fee: 50,
            connected: true
          }
        },
        { 
          id: 'PROG-002', 
          title: 'Tech Innovation Summit', 
          category: 'Technology', 
          status: 'Draft', 
          deadline: '2025-01-15', 
          entriesCount: 0,
          paymentConfig: {
            enabled: false,
            provider: 'Stripe',
            currency: 'USD',
            fee: 0,
            connected: false
          }
        },
        { 
          id: 'PROG-003', 
          title: 'Sustainable Future Grants', 
          category: 'Sustainability', 
          status: 'Active', 
          deadline: '2024-11-30', 
          entriesCount: 45,
          paymentConfig: {
            enabled: true,
            provider: 'PayPal',
            currency: 'EUR',
            fee: 25,
            connected: true
          }
        },
      ];
      localStorage.setItem(this.PROGRAMS_KEY, JSON.stringify(initialPrograms));
    }

    if (!localStorage.getItem(this.SUBMISSIONS_KEY)) {
      const initialSubmissions: Submission[] = [
        { id: 'SUB-001', title: 'Eco-Friendly Packaging', applicant: 'Sarah Miller', category: 'Sustainability', status: 'Under Review', score: 8.5, date: '2024-10-22', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=50&h=50&fit=crop' },
        { id: 'SUB-002', title: 'Urban Vertical Gardens', applicant: 'James Chen', category: 'Architecture', status: 'Shortlisted', score: 9.2, date: '2024-10-21', image: 'https://images.unsplash.com/photo-1518544806308-837d58999b21?w=50&h=50&fit=crop' },
        { id: 'SUB-003', title: 'AI Medical Diagnostics', applicant: 'TechHealth Inc.', category: 'Innovation', status: 'Pending', score: null, date: '2024-10-20', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=50&h=50&fit=crop' },
        { id: 'SUB-004', title: 'Ocean Cleanup Drone', applicant: 'BlueWave Team', category: 'Sustainability', status: 'Accepted', score: 7.8, date: '2024-10-19', image: 'https://images.unsplash.com/photo-1484591974057-265bb767ef71?w=50&h=50&fit=crop' },
        { id: 'SUB-005', title: 'Community Art Center', applicant: 'Elena Ross', category: 'Architecture', status: 'Rejected', score: 4.5, date: '2024-10-18', image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=50&h=50&fit=crop' },
      ];
      localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(initialSubmissions));
    }

    if (!localStorage.getItem(this.JUDGES_KEY)) {
       const initialJudges: Judge[] = [
          { id: 'J-001', name: 'Dr. Alan Grant', email: 'alan@jurassic.com', status: 'Active', progress: 85, assignedCount: 20, completedCount: 17, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
          { id: 'J-002', name: 'Ellie Sattler', email: 'ellie@paleo.edu', status: 'Active', progress: 45, assignedCount: 20, completedCount: 9, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
          { id: 'J-003', name: 'Ian Malcolm', email: 'ian@chaos.math', status: 'Invited', progress: 0, assignedCount: 20, completedCount: 0, avatar: 'https://i.pravatar.cc/150?u=a04258114e29026302d' },
       ];
       localStorage.setItem(this.JUDGES_KEY, JSON.stringify(initialJudges));
    }

    if (!localStorage.getItem(this.CONTACTS_KEY)) {
       const initialContacts: Contact[] = [
          { 
            id: 'C-001', 
            name: 'Sarah Miller', 
            email: 'sarah.m@gmail.com', 
            role: 'Applicant', 
            status: 'Active', 
            lastActive: '2 mins ago', 
            avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
            source: 'Google Search',
            surveyAnswer: 'I was looking for a modern platform to host our sustainability design challenge.',
            joinedDate: '2024-10-15'
          },
          { 
            id: 'C-002', 
            name: 'James Chen', 
            email: 'j.chen@studio.design', 
            role: 'Applicant', 
            status: 'Active', 
            lastActive: '1 day ago', 
            avatar: 'https://i.pravatar.cc/150?u=2',
            source: 'LinkedIn',
            surveyAnswer: 'Saw a colleague post about their win on Nomify last year.',
            joinedDate: '2024-09-28'
          },
          { 
            id: 'C-003', 
            name: 'Dr. Alan Grant', 
            email: 'alan@jurassic.com', 
            role: 'Judge', 
            status: 'Active', 
            lastActive: '3 hours ago', 
            avatar: 'https://i.pravatar.cc/150?u=3',
            source: 'Direct Invite',
            surveyAnswer: 'Invited by the program organizer.',
            joinedDate: '2024-10-01'
          },
          { 
            id: 'C-004', 
            name: 'Admin User', 
            email: 'admin@nomify.com', 
            role: 'Admin', 
            status: 'Active', 
            lastActive: 'Now', 
            avatar: 'https://i.pravatar.cc/150?u=4',
            source: 'Internal',
            surveyAnswer: 'System Administrator',
            joinedDate: '2023-01-01'
          },
       ];
       localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(initialContacts));
    }

    if (!localStorage.getItem(this.MESSAGES_KEY)) {
      const initialMessages: Message[] = [
         { id: 'M-001', sender: 'Sarah Miller', senderAvatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', content: 'Hi, I had a question about the video format for the Design category. Is MP4 acceptable?', time: '10:30 AM', unread: true, threadId: 'T-001' },
         { id: 'M-002', sender: 'James Chen', senderAvatar: 'https://i.pravatar.cc/150?u=2', content: 'Thanks for the deadline extension!', time: 'Yesterday', unread: false, threadId: 'T-002' },
      ];
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(initialMessages));
    }

    if (!localStorage.getItem(this.SOCIAL_KEY)) {
      const initialSocial: SocialAccount[] = [
        { id: 'S-001', platform: 'Twitter', handle: '@nomify_hq', status: 'Connected', avatar: '' },
        { id: 'S-002', platform: 'LinkedIn', handle: 'Nomify Inc.', status: 'Connected', avatar: '' },
        { id: 'S-003', platform: 'Instagram', handle: '', status: 'Disconnected', avatar: '' },
        { id: 'S-004', platform: 'Facebook', handle: '', status: 'Disconnected', avatar: '' },
      ];
      localStorage.setItem(this.SOCIAL_KEY, JSON.stringify(initialSocial));
    }

    if (!localStorage.getItem(this.POSTS_KEY)) {
      const initialPosts: ScheduledPost[] = [
        { 
          id: 'P-001', 
          content: '🚀 Public voting is NOW OPEN for the Global Design Awards! Cast your vote for the best eco-packaging solutions. #DesignAwards #Sustainability', 
          platforms: ['Twitter', 'LinkedIn'], 
          scheduledFor: '2024-11-01 09:00 AM', 
          trigger: 'Voting Open',
          status: 'Scheduled',
          image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=150&q=80'
        },
        { 
          id: 'P-002', 
          content: '👀 We are halfway through the voting period! Thousands of votes have been cast. Make sure your voice is heard! 🗳️', 
          platforms: ['Twitter', 'Instagram'], 
          scheduledFor: '2024-11-15 12:00 PM', 
          trigger: 'Half-time',
          status: 'Draft',
          image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&q=80'
        }
      ];
      localStorage.setItem(this.POSTS_KEY, JSON.stringify(initialPosts));
    }

    if (!localStorage.getItem(this.ROLES_KEY)) {
      const initialRoles: Role[] = [
        { id: 'R-001', name: 'Admin', permissions: ['all'], usersCount: 2, color: 'bg-purple-100 text-purple-700' },
        { id: 'R-002', name: 'Editor', permissions: ['edit_content', 'view_submissions'], usersCount: 5, color: 'bg-blue-100 text-blue-700' },
        { id: 'R-003', name: 'Judge', permissions: ['score_entries'], usersCount: 12, color: 'bg-amber-100 text-amber-700' },
        { id: 'R-004', name: 'Viewer', permissions: ['view_analytics'], usersCount: 3, color: 'bg-slate-100 text-slate-700' },
      ];
      localStorage.setItem(this.ROLES_KEY, JSON.stringify(initialRoles));
    }

    if (!localStorage.getItem(this.LOGS_KEY)) {
      const initialLogs: Log[] = [
        { id: 'L-001', action: 'Updated Program Settings', user: 'Sarah Jenkins', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', details: 'Changed deadline for "Design Awards 2024"', timestamp: '2 mins ago', type: 'update' },
        { id: 'L-002', action: 'Invited New Judge', user: 'Sarah Jenkins', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', details: 'Invited Dr. Alan Grant to judging panel', timestamp: '1 hour ago', type: 'create' },
        { id: 'L-003', action: 'Deleted Submission', user: 'Admin User', userAvatar: 'https://i.pravatar.cc/150?u=4', details: 'Removed duplicate entry #SUB-098', timestamp: '5 hours ago', type: 'delete' },
        { id: 'L-004', action: 'Failed Login Attempt', user: 'Unknown', userAvatar: '', details: 'IP: 192.168.1.1', timestamp: 'Yesterday', type: 'warning' },
        { id: 'L-005', action: 'Published Winners', user: 'Sarah Jenkins', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', details: 'Global Design Awards 2023 winners live', timestamp: '2 days ago', type: 'create' },
      ];
      localStorage.setItem(this.LOGS_KEY, JSON.stringify(initialLogs));
    }
  }

  getPrograms(): Program[] {
    return JSON.parse(localStorage.getItem(this.PROGRAMS_KEY) || '[]');
  }

  addProgram(program: Omit<Program, 'id' | 'entriesCount'>): Program {
    const programs = this.getPrograms();
    const newProgram: Program = {
      ...program,
      id: `PROG-${String(programs.length + 1).padStart(3, '0')}`,
      entriesCount: 0
    };
    programs.push(newProgram);
    localStorage.setItem(this.PROGRAMS_KEY, JSON.stringify(programs));
    return newProgram;
  }

  updateProgram(program: Program) {
    const programs = this.getPrograms();
    const index = programs.findIndex(p => p.id === program.id);
    if (index !== -1) {
       programs[index] = program;
       localStorage.setItem(this.PROGRAMS_KEY, JSON.stringify(programs));
    }
  }

  getSubmissions(): Submission[] {
    return JSON.parse(localStorage.getItem(this.SUBMISSIONS_KEY) || '[]');
  }

  addSubmission(submission: Omit<Submission, 'id' | 'date' | 'score' | 'image'>): Submission {
    const submissions = this.getSubmissions();
    const newSubmission: Submission = {
      ...submission,
      id: `SUB-${String(submissions.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      score: null,
      image: `https://source.unsplash.com/random/50x50?${submission.category}`
    };
    submissions.unshift(newSubmission);
    localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(submissions));
    return newSubmission;
  }

  getJudges(): Judge[] {
     return JSON.parse(localStorage.getItem(this.JUDGES_KEY) || '[]');
  }

  getContacts(): Contact[] {
     return JSON.parse(localStorage.getItem(this.CONTACTS_KEY) || '[]');
  }

  getMessages(): Message[] {
     return JSON.parse(localStorage.getItem(this.MESSAGES_KEY) || '[]');
  }
  
  getSocialAccounts(): SocialAccount[] {
    return JSON.parse(localStorage.getItem(this.SOCIAL_KEY) || '[]');
  }

  getScheduledPosts(): ScheduledPost[] {
    return JSON.parse(localStorage.getItem(this.POSTS_KEY) || '[]');
  }

  getRoles(): Role[] {
    return JSON.parse(localStorage.getItem(this.ROLES_KEY) || '[]');
  }

  getLogs(): Log[] {
    return JSON.parse(localStorage.getItem(this.LOGS_KEY) || '[]');
  }

  getStats() {
    const submissions = this.getSubmissions();
    const programs = this.getPrograms();
    
    return {
      totalSubmissions: submissions.length,
      activePrograms: programs.filter(p => p.status === 'Active').length,
      pendingReview: submissions.filter(s => s.status === 'Pending' || s.status === 'Under Review').length,
      revenue: submissions.length * 45 // Mock revenue calc
    };
  }
}

export const db = new DemoDatabase();
