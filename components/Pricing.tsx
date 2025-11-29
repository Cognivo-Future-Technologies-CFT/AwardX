import React, { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { Button } from './Button';
import { PricingTier } from '../types';
import { motion } from 'framer-motion';

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$99",
    description: "Perfect for small competitions and local awards.",
    features: [
      "Up to 250 entries",
      "5 Judges",
      "Basic Form Builder",
      "Email Support",
      "Standard Gallery"
    ]
  },
  {
    name: "Growth",
    price: "$299",
    description: "For growing organizations needing automation.",
    recommended: true,
    features: [
      "Up to 1,000 entries",
      "Unlimited Judges",
      "WhatsApp Campaigns",
      "Multi-round Judging",
      "Remove AwardX Branding",
      "Priority Support"
    ]
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Full control for large-scale global programs.",
    features: [
      "Unlimited entries",
      "White-label Solution",
      "Custom API Access",
      "Dedicated Success Manager",
      "SLA & Contract Billing",
      "Custom Reporting"
    ]
  }
];

export const Pricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-32 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-display">Simple, transparent pricing</h2>
          <p className="text-slate-600 mb-8">Choose the plan that fits your program's scale.</p>
          
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm ${!isAnnual ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-14 h-7 bg-slate-200 rounded-full relative transition-colors focus:outline-none"
            >
              <div className={`absolute top-1 w-5 h-5 bg-indigo-600 rounded-full transition-all duration-300 ${isAnnual ? 'left-8' : 'left-1'}`}></div>
            </button>
            <span className={`text-sm ${isAnnual ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>Annual <span className="text-indigo-600 text-xs ml-1 font-bold">(Save 20%)</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative p-8 rounded-3xl flex flex-col transition-all duration-300 ${
                tier.recommended 
                  ? 'bg-slate-900 text-white shadow-2xl shadow-indigo-500/20 scale-105 z-10' 
                  : 'bg-white text-slate-900 shadow-xl shadow-slate-200/50 hover:-translate-y-2'
              }`}
            >
              {tier.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center">
                  <Zap className="w-3 h-3 mr-1 fill-current" /> MOST POPULAR
                </div>
              )}

              <div className="mb-8">
                <h3 className={`text-xl font-bold mb-2 font-display ${tier.recommended ? 'text-white' : 'text-slate-900'}`}>{tier.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className={`text-4xl font-extrabold ${tier.recommended ? 'text-white' : 'text-slate-900'}`}>
                    {tier.price === "Custom" ? "Custom" : (isAnnual ? tier.price : `$${parseInt(tier.price.slice(1)) * 1.2}`.split('.')[0])}
                  </span>
                  {tier.price !== "Custom" && <span className={`ml-2 ${tier.recommended ? 'text-slate-400' : 'text-slate-500'}`}>/month</span>}
                </div>
                <p className={`text-sm leading-relaxed ${tier.recommended ? 'text-slate-400' : 'text-slate-500'}`}>{tier.description}</p>
              </div>

              <div className={`w-full h-px mb-8 ${tier.recommended ? 'bg-white/10' : 'bg-slate-100'}`}></div>

              <ul className="space-y-4 mb-8 flex-grow">
                {tier.features.map((feature, fIndex) => (
                  <li key={fIndex} className={`flex items-start text-sm ${tier.recommended ? 'text-slate-300' : 'text-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 shrink-0 ${tier.recommended ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                       <Check className={`w-3 h-3 ${tier.recommended ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                variant={tier.recommended ? 'white' : 'primary'} 
                className="w-full"
              >
                {tier.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};