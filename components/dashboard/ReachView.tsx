
import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { SocialAccount, ScheduledPost } from '../../services/models';
import { 
  Twitter, Linkedin, Facebook, Instagram, Share2, 
  Zap, Calendar, MoreHorizontal, Check, Plus, AlertCircle,
  Trophy, Clock, Megaphone, LayoutTemplate
} from 'lucide-react';
import { Button } from '../Button';

export const ReachView: React.FC = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);

  useEffect(() => {
    const load = async () => {
      const [a, p] = await Promise.all([
        db.getSocialAccounts(),
        db.getScheduledPosts(),
      ]);
      setAccounts(a);
      setPosts(p);
    };
    load();
  }, []);

  const getIcon = (platform: string) => {
    switch(platform) {
      case 'Twitter': return <Twitter className="w-5 h-5" />;
      case 'LinkedIn': return <Linkedin className="w-5 h-5" />;
      case 'Facebook': return <Facebook className="w-5 h-5" />;
      case 'Instagram': return <Instagram className="w-5 h-5" />;
      default: return <Share2 className="w-5 h-5" />;
    }
  };

  const getColor = (platform: string) => {
    switch(platform) {
      case 'Twitter': return 'text-sky-500 bg-sky-50 border-sky-100';
      case 'LinkedIn': return 'text-blue-700 bg-blue-50 border-blue-100';
      case 'Facebook': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Instagram': return 'text-pink-600 bg-pink-50 border-pink-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const templates = [
    {
      title: "Winner Announcement",
      description: "Celebrate your winners with a flashy announcement.",
      content: "🏆 And the winner is... [Winner Name]! Congratulations on winning the [Category] award at [Event Name]. #Awards #Winner",
      icon: Trophy,
      color: "text-yellow-600 bg-yellow-50 border-yellow-100"
    },
    {
      title: "Early Bird Reminder",
      description: "Drive urgency before the price increase.",
      content: "⏳ Tick tock! Early bird pricing for [Event Name] ends in 48 hours. Submit your entry now to save money! 👉 [Link]",
      icon: Clock,
      color: "text-rose-600 bg-rose-50 border-rose-100"
    },
    {
      title: "Call for Entries",
      description: "Announce that submissions are open.",
      content: "📣 Calling all creators! Applications are now OPEN for [Event Name]. Showcase your work to industry leaders. Apply here: [Link]",
      icon: Megaphone,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100"
    }
  ];

  return (
    <div className="space-y-8">
         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Reach & Campaigns</h1>
           <p className="text-slate-500">Automate your social presence and drive engagement.</p>
        </div>
        <Button className="flex items-center gap-2">
           <Plus className="w-4 h-4" /> Create Campaign
        </Button>
      </div>

      {/* Connected Accounts */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Connected Channels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:border-indigo-200 transition-colors">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${getColor(account.platform)} border-2`}>
                {getIcon(account.platform)}
              </div>
              <h3 className="font-bold text-slate-900">{account.platform}</h3>
              <p className="text-xs text-slate-500 mb-4 h-4">
                {account.status === 'Connected' ? account.handle : 'Not Connected'}
              </p>
              
              {account.status === 'Connected' ? (
                <button className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full flex items-center gap-1 border border-green-100">
                  <Check className="w-3 h-3" /> Connected
                </button>
              ) : (
                <button className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-full border border-slate-200 transition-colors">
                  Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Automation Triggers */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
           <Zap className="w-5 h-5 text-amber-500" /> Smart Triggers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Share2 className="w-6 h-6" />
                 </div>
                 <div className="form-checkbox h-6 w-12 bg-white/30 rounded-full p-1 cursor-pointer">
                    <div className="h-4 w-4 bg-white rounded-full shadow-md transform translate-x-6"></div>
                 </div>
              </div>
              <h3 className="font-bold text-lg mb-1 relative z-10">Voting Launch Blast</h3>
              <p className="text-indigo-100 text-sm relative z-10">
                 Automatically post to all channels when public voting opens.
              </p>
           </div>

           <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div className="h-6 w-12 bg-slate-200 rounded-full p-1 cursor-pointer">
                    <div className="h-4 w-4 bg-white rounded-full shadow-sm"></div>
                 </div>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">Half-time Booster</h3>
              <p className="text-slate-500 text-sm">
                 Post a reminder when 50% of the voting duration has elapsed to drive urgency.
              </p>
           </div>

           <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <Check className="w-6 h-6" />
                 </div>
                 <div className="h-6 w-12 bg-slate-200 rounded-full p-1 cursor-pointer">
                    <div className="h-4 w-4 bg-white rounded-full shadow-sm"></div>
                 </div>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">Winner Announcement</h3>
              <p className="text-slate-500 text-sm">
                 Instantly share result graphics when the competition is finalized.
              </p>
           </div>
        </div>
      </section>

      {/* Campaign Templates */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
           <LayoutTemplate className="w-5 h-5 text-purple-500" /> Quick Templates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {templates.map((template, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group">
                 <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl border ${template.color}`}>
                       <template.icon className="w-6 h-6" />
                    </div>
                    <button className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-indigo-600 hover:border-indigo-200">
                       <Plus className="w-4 h-4" />
                    </button>
                 </div>
                 <h3 className="font-bold text-slate-900 text-lg mb-2">{template.title}</h3>
                 <p className="text-slate-500 text-sm mb-4 h-10">{template.description}</p>
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-600 italic leading-relaxed">"{template.content}"</p>
                 </div>
              </div>
           ))}
        </div>
      </section>

      {/* Content Queue */}
      <section>
         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Content
         </h2>
         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-3 text-xs text-slate-500 md:hidden">Swipe horizontally to view all columns.</div>
            <div className="overflow-x-auto">
               <table className="w-full min-w-[920px] text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="p-4 pl-6">Content Preview</th>
                        <th className="p-4">Channels</th>
                        <th className="p-4">Trigger / Time</th>
                        <th className="p-4">Status</th>
                        <th className="p-4"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {posts.map((post) => (
                        <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-4 pl-6 max-w-md">
                              <div className="flex items-start gap-4">
                                 {post.image && (
                                    <img src={post.image} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0" />
                                 )}
                                 <div>
                                    <p className="text-sm text-slate-700 line-clamp-2 font-medium">{post.content}</p>
                                    <div className="flex gap-2 mt-2">
                                       {post.image && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">Image Attached</span>}
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-4">
                              <div className="flex -space-x-2">
                                 {post.platforms.map((p, i) => (
                                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${getColor(p)}`}>
                                       {getIcon(p)}
                                    </div>
                                 ))}
                              </div>
                           </td>
                           <td className="p-4">
                              {post.trigger !== 'Manual' ? (
                                 <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                                    <Zap className="w-4 h-4" /> {post.trigger}
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-2 text-slate-600 text-sm">
                                    <Calendar className="w-4 h-4 text-slate-400" /> {post.scheduledFor}
                                 </div>
                              )}
                           </td>
                           <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                 post.status === 'Scheduled' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                 post.status === 'Posted' ? 'bg-green-50 text-green-700 border border-green-100' :
                                 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                 {post.status}
                              </span>
                           </td>
                           <td className="p-4 text-right">
                              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors">
                                 <MoreHorizontal className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </section>
    </div>
  );
};
