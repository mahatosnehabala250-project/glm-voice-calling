'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  Heart,
  Send,
  X,
  Sparkles,
} from 'lucide-react';

/* ============================================================
   Constants & Types
   ============================================================ */
const FEEDBACK_AUTO_SHOW_KEY = 'voiceai-feedback-auto-shown';
const AUTO_SHOW_DELAY = 60000; // 60 seconds

interface FeedbackCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgClass: string;
  borderClass: string;
  activeBgClass: string;
  activeBorderClass: string;
  activeTextClass: string;
}

const categories: FeedbackCategory[] = [
  {
    id: 'bug',
    label: 'Bug Report',
    icon: Bug,
    color: 'text-rose-500',
    bgClass: 'bg-rose-50 dark:bg-rose-900/20',
    borderClass: 'border-rose-200 dark:border-rose-800',
    activeBgClass: 'bg-rose-100 dark:bg-rose-900/40',
    activeBorderClass: 'border-rose-400 dark:border-rose-600',
    activeTextClass: 'text-rose-700 dark:text-rose-400',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
    activeBgClass: 'bg-amber-100 dark:bg-amber-900/40',
    activeBorderClass: 'border-amber-400 dark:border-amber-600',
    activeTextClass: 'text-amber-700 dark:text-amber-400',
  },
  {
    id: 'feedback',
    label: 'General Feedback',
    icon: MessageSquare,
    color: 'text-teal-500',
    bgClass: 'bg-teal-50 dark:bg-teal-900/20',
    borderClass: 'border-teal-200 dark:border-teal-800',
    activeBgClass: 'bg-teal-100 dark:bg-teal-900/40',
    activeBorderClass: 'border-teal-400 dark:border-teal-600',
    activeTextClass: 'text-teal-700 dark:text-teal-400',
  },
  {
    id: 'love',
    label: 'Love It!',
    icon: Heart,
    color: 'text-emerald-500',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    activeBgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
    activeBorderClass: 'border-emerald-400 dark:border-emerald-600',
    activeTextClass: 'text-emerald-700 dark:text-emerald-400',
  },
];

/* ============================================================
   Floating Feedback Button
   ============================================================ */
function FeedbackButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[55]',
        'w-14 h-14 rounded-2xl shadow-xl',
        'bg-gradient-to-br from-emerald-500 to-teal-600',
        'hover:from-emerald-600 hover:to-teal-700',
        'flex items-center justify-center',
        'transition-shadow duration-300',
        'hover:shadow-2xl hover:shadow-emerald-500/30',
        'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2',
        'dark:focus:ring-offset-slate-900',
      )}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      animate={isHovered ? {} : { y: [0, -3, 0] }}
      transition={isHovered ? {} : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      aria-label="Send feedback"
    >
      <MessageCircle className="w-6 h-6 text-white" />
      {/* Notification pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-emerald-400/50"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}

/* ============================================================
   Star Rating Component
   ============================================================ */
function StarRating({ rating, onRate, hoverRating, onHover }: {
  rating: number;
  onRate: (rating: number) => void;
  hoverRating: number;
  onHover: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          onClick={() => onRate(star)}
          onMouseEnter={() => onHover(star)}
          onMouseLeave={() => onHover(0)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="focus:outline-none p-0.5"
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'w-8 h-8 transition-colors duration-150',
              star <= (hoverRating || rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-200 dark:text-slate-700'
            )}
          />
        </motion.button>
      ))}
      {rating > 0 && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400"
        >
          {rating}/5
        </motion.span>
      )}
    </div>
  );
}

/* ============================================================
   Main Feedback Widget Component
   ============================================================ */
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const { user } = useAuthStore();

  // Auto-show after 60 seconds on first visit (client only)
  useEffect(() => {
    if (!user || user.role !== 'client') return;
    try {
      const alreadyShown = localStorage.getItem(FEEDBACK_AUTO_SHOW_KEY);
      if (!alreadyShown) {
        const timer = setTimeout(() => {
          setOpen(true);
          try {
            localStorage.setItem(FEEDBACK_AUTO_SHOW_KEY, 'true');
          } catch { /* ignore */ }
        }, AUTO_SHOW_DELAY);
        return () => clearTimeout(timer);
      }
    } catch { /* localStorage not available */ }
  }, [user]);

  const handleSubmit = useCallback(async () => {
    if (!rating && !selectedCategory && !comment.trim()) {
      toast.error('Please provide a rating, category, or comment');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setJustSubmitted(true);

    toast.success('Thank you for your feedback!', {
      description: 'Your input helps us improve VoiceAI.',
    });

    // Reset form after showing success state
    setTimeout(() => {
      setJustSubmitted(false);
      setRating(0);
      setSelectedCategory(null);
      setComment('');
      setOpen(false);
    }, 2000);
  }, [rating, selectedCategory, comment]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      setOpen(false);
      if (justSubmitted) {
        setJustSubmitted(false);
        setRating(0);
        setSelectedCategory(null);
        setComment('');
      }
    } else {
      setOpen(isOpen);
    }
  }, [isSubmitting, justSubmitted]);

  // Only show for client role
  if (!user || user.role !== 'client') return null;

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <>
      <FeedbackButton onClick={() => setOpen(true)} />

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-md overflow-y-auto">
          {/* Success State */}
          <AnimatePresence mode="wait">
            {justSubmitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                >
                  <Heart className="w-10 h-10 text-white fill-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Thank You!
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  Your feedback has been submitted. We appreciate you helping us make VoiceAI better.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900">
                  <SheetHeader>
                    <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      How are you finding VoiceAI?
                    </SheetTitle>
                    <SheetDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Your feedback helps us build a better product for you.
                    </SheetDescription>
                  </SheetHeader>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-5 space-y-6">
                  {/* Star Rating */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      Rate Your Experience
                    </label>
                    <StarRating
                      rating={rating}
                      onRate={setRating}
                      hoverRating={hoverRating}
                      onHover={setHoverRating}
                    />
                    {(hoverRating || rating) > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-medium text-amber-600 dark:text-amber-400"
                      >
                        {ratingLabels[hoverRating || rating]}
                      </motion.p>
                    )}
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      What&apos;s this about?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = selectedCategory === cat.id;
                        return (
                          <motion.button
                            key={cat.id}
                            onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all duration-200',
                              isActive
                                ? `${cat.activeBgClass} ${cat.activeBorderClass}`
                                : `${cat.bgClass} ${cat.borderClass} hover:opacity-80`
                            )}
                          >
                            <Icon className={cn(
                              'w-4 h-4 flex-shrink-0',
                              isActive ? cat.activeTextClass : cat.color
                            )} />
                            <span className={cn(
                              'text-xs font-medium',
                              isActive ? cat.activeTextClass : 'text-slate-600 dark:text-slate-400'
                            )}>
                              {cat.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Your Comments
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us more about your experience..."
                      className="min-h-[100px] resize-none border-slate-200 dark:border-slate-700 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-600 rounded-xl text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      maxLength={500}
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right">
                      {comment.length}/500
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="px-6 pb-6 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full h-11 rounded-xl shadow-lg transition-all duration-200 font-medium',
                      'bg-gradient-to-r from-emerald-600 to-teal-600',
                      'hover:from-emerald-700 hover:to-teal-700',
                      'text-white shadow-emerald-500/20',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  );
}
