'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain, Plus, Search, Trash2, Tag, Sparkles, Clock, Phone,
  Lightbulb, X, ChevronDown, ChevronUp
} from 'lucide-react';

/* ============================================================
   Types & Data
   ============================================================ */

interface ContactMemory {
  id: string;
  phoneNumber: string;
  insight: string;
  category: string;
  confidence: number;
  sourceCallId: string | null;
  extractedBy: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  preference: { label: 'Preference', color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/20', borderColor: 'border-sky-200 dark:border-sky-800' },
  medical: { label: 'Medical', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-900/20', borderColor: 'border-rose-200 dark:border-rose-800' },
  objection: { label: 'Objection', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800' },
  callback: { label: 'Callback', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800' },
  general: { label: 'General', color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-800/50', borderColor: 'border-slate-200 dark:border-slate-700' },
};

// Sample demo data for display when no phone is searched
const DEMO_MEMORIES: ContactMemory[] = [
  {
    id: 'demo-1', phoneNumber: '+919876543210', insight: 'Prefers morning appointments before 11 AM due to office schedule',
    category: 'preference', confidence: 0.95, sourceCallId: null, extractedBy: 'ai',
    createdAt: '2025-01-15T10:30:00Z', updatedAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 'demo-2', phoneNumber: '+919876543210', insight: 'Has dental anxiety - schedule longer consultation slots and use gentle language',
    category: 'medical', confidence: 0.88, sourceCallId: null, extractedBy: 'ai',
    createdAt: '2025-01-14T14:20:00Z', updatedAt: '2025-01-14T14:20:00Z',
  },
  {
    id: 'demo-3', phoneNumber: '+919876543210', insight: 'Price-sensitive - always compare fees with nearby clinics before confirming',
    category: 'objection', confidence: 0.82, sourceCallId: null, extractedBy: 'ai',
    createdAt: '2025-01-13T09:15:00Z', updatedAt: '2025-01-13T09:15:00Z',
  },
  {
    id: 'demo-4', phoneNumber: '+919812345678', insight: 'Called 3 times last week for root canal follow-up - needs priority scheduling',
    category: 'callback', confidence: 0.91, sourceCallId: null, extractedBy: 'ai',
    createdAt: '2025-01-12T16:45:00Z', updatedAt: '2025-01-12T16:45:00Z',
  },
  {
    id: 'demo-5', phoneNumber: '+919876543210', insight: 'Speaks Hindi - prefers AI agent to respond in Hindi rather than English',
    category: 'preference', confidence: 0.93, sourceCallId: null, extractedBy: 'ai',
    createdAt: '2025-01-11T11:00:00Z', updatedAt: '2025-01-11T11:00:00Z',
  },
  {
    id: 'demo-6', phoneNumber: '+919988776655', insight: 'Diabetic patient - requires afternoon appointments after meals',
    category: 'medical', confidence: 0.97, sourceCallId: null, extractedBy: 'ai',
    createdAt: '2025-01-10T13:30:00Z', updatedAt: '2025-01-10T13:30:00Z',
  },
  {
    id: 'demo-7', phoneNumber: '+919812345678', insight: 'Family of 4 members - all visit the same clinic for regular checkups',
    category: 'general', confidence: 0.85, sourceCallId: null, extractedBy: 'manual',
    createdAt: '2025-01-09T08:20:00Z', updatedAt: '2025-01-09T08:20:00Z',
  },
];

/* ============================================================
   Sub-components
   ============================================================ */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const colorClass = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500';
  const textColorClass = pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('text-[10px] font-mono font-semibold min-w-[32px] text-right', textColorClass)}>
        {pct}%
      </span>
    </div>
  );
}

function MemoryCard({ memory, onDelete }: { memory: ContactMemory; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const catConfig = CATEGORY_CONFIG[memory.category] || CATEGORY_CONFIG.general;
  const isAi = memory.extractedBy === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'overflow-hidden transition-all duration-200 hover:shadow-md border',
        catConfig.borderColor
      )}>
        <CardContent className="p-4">
          {/* Top row: category badge + source + delete */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0', catConfig.bgColor, catConfig.color, catConfig.borderColor)}>
                <Tag className="w-3 h-3 mr-1" />
                {catConfig.label}
              </Badge>
              {isAi ? (
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  AI
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                  Manual
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={() => onDelete(memory.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Insight text */}
          <p className={cn(
            'text-sm text-slate-700 dark:text-slate-300 leading-relaxed',
            !expanded && 'line-clamp-2'
          )}>
            <Lightbulb className="w-3.5 h-3.5 inline mr-1.5 text-amber-500 shrink-0" />
            {memory.insight}
          </p>

          {memory.insight.length > 80 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 text-[11px] text-slate-400 dark:text-slate-500 hover:text-emerald-500 mt-1.5 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          {/* Confidence bar */}
          <div className="mt-3">
            <ConfidenceBar value={memory.confidence} />
          </div>

          {/* Bottom row: phone + timestamp */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
              <Phone className="w-3 h-3" />
              {memory.phoneNumber.replace(/(\+\d{2})(\d{5})(\d{5})/, '$1 $2 $3')}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(memory.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatsSummary({ memories }: { memories: ContactMemory[] }) {
  const total = memories.length;
  const categoryCounts: Record<string, number> = {};
  for (const m of memories) {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
  }

  const avgConfidence = total > 0
    ? memories.reduce((sum, m) => sum + m.confidence, 0) / total
    : 0;
  const aiCount = memories.filter(m => m.extractedBy === 'ai').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/15 dark:to-teal-900/15 border border-emerald-200/60 dark:border-emerald-800/40">
        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{total}</div>
        <div className="text-[11px] text-emerald-600 dark:text-emerald-500 font-medium">Total Memories</div>
      </div>
      <div className="p-3 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/15 dark:to-purple-900/15 border border-violet-200/60 dark:border-violet-800/40">
        <div className="text-lg font-bold text-violet-700 dark:text-violet-400">{aiCount}</div>
        <div className="text-[11px] text-violet-600 dark:text-violet-500 font-medium">AI Extracted</div>
      </div>
      <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 border border-amber-200/60 dark:border-amber-800/40">
        <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{Math.round(avgConfidence * 100)}%</div>
        <div className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">Avg Confidence</div>
      </div>
      <div className="p-3 rounded-lg bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/15 dark:to-blue-900/15 border border-sky-200/60 dark:border-sky-800/40">
        <div className="text-lg font-bold text-sky-700 dark:text-sky-400">{Object.keys(categoryCounts).length}</div>
        <div className="text-[11px] text-sky-600 dark:text-sky-500 font-medium">Categories</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-900/20 blur-xl" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
          <Brain className="w-10 h-10 text-emerald-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-6">No memories yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center max-w-sm">
        AI automatically extracts insights from call transcripts. Search by phone number to see contact memories, or add one manually.
      </p>
      <div className="flex items-center gap-2 mt-4">
        <Sparkles className="w-4 h-4 text-emerald-500" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">AI learns from every conversation</span>
      </div>
    </motion.div>
  );
}

/* ============================================================
   Main Component
   ============================================================ */

export default function ContactMemoryPanel() {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [memories, setMemories] = useState<ContactMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Add memory dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newInsight, setNewInsight] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newPhone, setNewPhone] = useState('');
  const [addingMemory, setAddingMemory] = useState(false);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchMemories = useCallback(async (phone?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      const res = await fetch(`/api/client/contact-memory?${params.toString()}`, {
        headers: { 'x-clinic-id': 'demo-clinic-1' },
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    if (!phoneSearch.trim()) {
      setHasSearched(false);
      setMemories([]);
      return;
    }
    setHasSearched(true);
    fetchMemories(phoneSearch.trim());
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/client/contact-memory?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-clinic-id': 'demo-clinic-1' },
      });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch {
      // Silently fail
    }
  };

  const handleAddMemory = async () => {
    if (!newPhone.trim() || !newInsight.trim()) return;
    setAddingMemory(true);
    try {
      const res = await fetch('/api/client/contact-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': 'demo-clinic-1' },
        body: JSON.stringify({
          phoneNumber: newPhone.trim(),
          insight: newInsight.trim(),
          category: newCategory,
          extractedBy: 'manual',
          confidence: 1.0,
        }),
      });
      if (res.ok) {
        setShowAddDialog(false);
        setNewInsight('');
        setNewPhone('');
        setNewCategory('general');
        if (hasSearched) fetchMemories(phoneSearch.trim());
      }
    } catch {
      // Silently fail
    } finally {
      setAddingMemory(false);
    }
  };

  // Use demo data when not searching
  const displayMemories = hasSearched ? memories : DEMO_MEMORIES;
  const filteredMemories = categoryFilter === 'all'
    ? displayMemories
    : displayMemories.filter(m => m.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Contact Memory</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">AI-powered CRM insights from call conversations</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by phone number (e.g. +919876543210)"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>
            <Button onClick={handleSearch} variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {phoneSearch && (
              <Button variant="ghost" size="icon" onClick={() => { setPhoneSearch(''); setHasSearched(false); setMemories([]); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filter:</span>
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'px-3 py-1 text-xs rounded-full font-medium transition-all',
            categoryFilter === 'all'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          All
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={cn(
              'px-3 py-1 text-xs rounded-full font-medium transition-all',
              categoryFilter === key
                ? cn(cfg.bgColor, cfg.color, 'ring-1 ring-current shadow-sm')
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      {displayMemories.length > 0 && (
        <StatsSummary memories={displayMemories} />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-emerald-500">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Searching memories...</span>
          </div>
        </div>
      )}

      {/* Memory Cards */}
      {!loading && filteredMemories.length > 0 && (
        <div className="grid gap-3 max-h-[600px] overflow-y-auto pr-1">
          <AnimatePresence>
            {filteredMemories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty States */}
      {!loading && hasSearched && filteredMemories.length === 0 && (
        <EmptyState />
      )}
      {!loading && !hasSearched && filteredMemories.length === 0 && (
        <EmptyState />
      )}

      {/* Demo banner when showing sample data */}
      {!hasSearched && displayMemories.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Showing sample data — search a phone number to view real contact memories
          </span>
        </div>
      )}

      {/* Add Memory Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-500" />
              Add Contact Memory
            </DialogTitle>
            <DialogDescription>
              Manually add an insight about a patient. AI will also learn from call transcripts automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Phone Number *
              </label>
              <Input
                placeholder="+919876543210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Insight / Memory *
              </label>
              <textarea
                placeholder="e.g. Patient prefers morning appointments, has dental anxiety..."
                value={newInsight}
                onChange={(e) => setNewInsight(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">{newInsight.length}/1000 characters</span>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Category
              </label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMemory}
              disabled={!newPhone.trim() || !newInsight.trim() || addingMemory}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              {addingMemory ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Memory
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
