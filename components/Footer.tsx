import React from 'react';
import { Twitter, Linkedin, Github, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { GITHUB_REPO } from '@/lib/brand';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <div className="mb-6">
              <Logo size="xl" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              An award management system for running competitions, grants, and creative recognition programs &mdash; built in public on GitHub.
            </p>
            <div className="flex space-x-4">
              <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors"><Github className="w-5 h-5"/></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><MessageCircle className="w-5 h-5"/></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Twitter className="w-5 h-5"/></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin className="w-5 h-5"/></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="/features" className="hover:text-cyan-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Self-Host Guide</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Showcase</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Open Source</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">GitHub Repository</a></li>
              <li><a href={`${GITHUB_REPO}/issues`} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Issues</a></li>
              <li><a href={`${GITHUB_REPO}/pulls`} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">Pull Requests</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Community</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Discord Server</a></li>
              <li><a href={`${GITHUB_REPO}/discussions`} target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">GitHub Discussions</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-cyan-400 transition-colors">Changelog</a></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} &mdash; Built in public on GitHub.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Code of Conduct</a>
            <a href="#" className="hover:text-white">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};