'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';
import {
  Search,
  Rocket,
  Brain,
  CreditCard,
  FileCode,
  Mail,
  Phone,
  MessageCircle,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react';

/* ============================================================
   Quick Link Data
   ============================================================ */
interface QuickLink {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  bgClass: string;
  iconBgClass: string;
  iconTextClass: string;
}

const quickLinks: QuickLink[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    description: 'Quick setup guide for your clinic',
    icon: Rocket,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50',
    iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconTextClass: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'ai-configuration',
    label: 'AI Configuration',
    description: 'Customize your AI agent behavior',
    icon: Brain,
    bgClass: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-950/50',
    iconBgClass: 'bg-teal-100 dark:bg-teal-900/40',
    iconTextClass: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'billing-plans',
    label: 'Billing & Plans',
    description: 'Manage subscriptions & invoices',
    icon: CreditCard,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/40',
    iconTextClass: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'api-documentation',
    label: 'API Documentation',
    description: 'Developer reference & endpoints',
    icon: FileCode,
    bgClass: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-950/50',
    iconBgClass: 'bg-violet-100 dark:bg-violet-900/40',
    iconTextClass: 'text-violet-600 dark:text-violet-400',
  },
];

/* ============================================================
   FAQ Data
   ============================================================ */
interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: 'faq-calls',
    question: 'How does VoiceAI handle incoming calls?',
    answer: 'When a patient calls your clinic number, VoiceAI answers automatically using our AI agent powered by Gemini. The AI greets the patient, understands their intent (booking, inquiry, rescheduling), checks real-time availability, and books appointments directly into your calendar. The entire conversation is transcribed and logged for your review.',
  },
  {
    id: 'faq-greeting',
    question: 'Can I customize the AI greeting?',
    answer: 'Yes! Go to Settings > AI Configuration to customize your AI agent\'s greeting message, language preference (Hinglish, English, or Hindi), tone, and personality. You can also set up custom responses for specific services and define escalation rules.',
  },
  {
    id: 'faq-appointments',
    question: 'How are appointments confirmed?',
    answer: 'Once the AI books an appointment, a confirmation is sent automatically via WhatsApp to the patient\'s registered phone number. The message includes the date, time, doctor name, and clinic address. You can track all sent confirmations in the Appointments tab.',
  },
  {
    id: 'faq-escalation',
    question: 'What happens when a patient asks for a human?',
    answer: 'VoiceAI has a smart escalation system. When a patient explicitly requests to speak with a human or the AI detects a complex query, the call is automatically transferred to your designated clinic staff number. You can configure escalation triggers and staff numbers in Settings.',
  },
  {
    id: 'faq-upgrade',
    question: 'How do I upgrade my plan?',
    answer: 'You can upgrade your plan anytime by going to the Billing section or contacting our support team at support@voiceai.in. We offer flexible plans for clinics of all sizes — from solo practitioners to multi-location hospitals. All upgrades take effect immediately.',
  },
];

/* ============================================================
   Animation Variants
   ============================================================ */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.19, 1, 0.22, 1] } },
  exit: { opacity: 0, scale: 0.96, y: 16, transition: { duration: 0.2, ease: 'easeIn' } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: 0.1 + i * 0.08, ease: 'easeOut' },
  }),
};

/* ============================================================
   Help Center Component
   ============================================================ */
export default function HelpCenter() {
  const { helpCenterOpen, setHelpCenterOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter FAQ items based on search
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return faqItems;
    const lower = searchQuery.toLowerCase().trim();
    return faqItems.filter(
      (faq) =>
        faq.question.toLowerCase().includes(lower) ||
        faq.answer.toLowerCase().includes(lower),
    );
  }, [searchQuery]);

  // Filter quick links based on search
  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return quickLinks;
    const lower = searchQuery.toLowerCase().trim();
    return quickLinks.filter(
      (link) =>
        link.label.toLowerCase().includes(lower) ||
        link.description.toLowerCase().includes(lower),
    );
  }, [searchQuery]);

  const hasResults = filteredFAQs.length > 0 || filteredLinks.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <Dialog open={helpCenterOpen} onOpenChange={setHelpCenterOpen}>
      <AnimatePresence>
        {helpCenterOpen && (
          <DialogContent
            showCloseButton={false}
            className="p-0 gap-0 overflow-hidden rounded-2xl border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl max-w-2xl max-h-[85vh] flex flex-col"
          >
            {/* Visually hidden for accessibility */}
            <DialogTitle className="sr-only">Help Center</DialogTitle>
            <DialogDescription className="sr-only">Search help articles, FAQ, and contact support</DialogDescription>

            {/* Header with gradient */}
            <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Help Center
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Find answers, guides, and support
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search help articles..."
                  className="pl-10 pr-4 py-2.5 h-11 bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/50 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 rounded-xl text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200"
                />
                {searchQuery && (
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    ESC
                  </kbd>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {!hasResults && isSearching ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500"
                  >
                    <Search className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No results found</p>
                    <p className="text-xs mt-1 opacity-70">
                      Try &quot;appointment&quot; or &quot;billing&quot;
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="px-6 py-5 space-y-6">
                      {/* Quick Links Grid */}
                      {!isSearching && (
                        <motion.div custom={0} variants={sectionVariants}>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                            Quick Links
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {filteredLinks.map((link, idx) => {
                              const Icon = link.icon;
                              return (
                                <motion.button
                                  key={link.id}
                                  custom={idx + 1}
                                  variants={sectionVariants}
                                  initial="hidden"
                                  animate="visible"
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  className={cn(
                                    'flex flex-col items-start gap-2.5 p-4 rounded-xl border transition-all duration-200 text-left',
                                    link.bgClass,
                                  )}
                                  onClick={() => setHelpCenterOpen(false)}
                                >
                                  <div
                                    className={cn(
                                      'w-9 h-9 rounded-lg flex items-center justify-center',
                                      link.iconBgClass,
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        'w-4.5 h-4.5',
                                        link.iconTextClass,
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {link.label}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {link.description}
                                    </p>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* FAQ Accordion */}
                      <motion.div custom={2} variants={sectionVariants}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                          Frequently Asked Questions
                        </h3>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                          <Accordion type="single" collapsible className="w-full">
                            {filteredFAQs.map((faq, idx) => (
                              <AccordionItem
                                key={faq.id}
                                value={faq.id}
                                className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 px-4"
                              >
                                <AccordionTrigger className="py-3.5 text-sm font-medium text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 hover:no-underline text-left">
                                  <span className="flex items-center gap-2.5">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex-shrink-0">
                                      {idx + 1}
                                    </span>
                                    {faq.question}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-8 pr-1">
                                  {faq.answer}
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </motion.div>

                      {/* Contact Support Card */}
                      {!isSearching && (
                        <motion.div custom={3} variants={sectionVariants}>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                            Contact Support
                          </h3>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 dark:from-emerald-950/10 dark:via-slate-900 dark:to-teal-950/10 overflow-hidden">
                            <div className="p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                  <MessageCircle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Need more help?
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Our team is available Mon–Sat, 9 AM–7 PM IST
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                {/* Email */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Email</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                      support@voiceai.in
                                    </p>
                                  </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40">
                                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                    <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">Phone</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                      +91-80-4567-8900
                                    </p>
                                  </div>
                                </div>

                                {/* WhatsApp */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/40">
                                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                                    <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-400 dark:text-slate-500">WhatsApp</p>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                      +91-80-4567-8900
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Schedule Demo CTA */}
                              <Button
                                className="w-full mt-4 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 font-medium"
                                onClick={() => setHelpCenterOpen(false)}
                              >
                                <CalendarCheck className="w-4 h-4 mr-2" />
                                Schedule a Demo
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
