'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Pencil, Trash2, Search, Upload, FileText, Download,
  Sparkles, AlertTriangle, CheckCircle2, HelpCircle, ChevronDown, ChevronRight,
  Lightbulb, RefreshCw, X, Tag, Brain, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface KnowledgeData {
  faqs: FAQ[];
  sampleFaqs?: FAQ[];
  hasCustomFaqs?: boolean;
  services: string[];
  clinicDescription: string;
  specializations: string;
  specialNotes: string;
}

const CATEGORIES = ['All', 'General', 'Fees', 'Services', 'Emergency', 'Timing'];
const CATEGORY_COLORS: Record<string, string> = {
  General: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Fees: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Services: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Emergency: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  Timing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
const CATEGORY_ICONS: Record<string, string> = {
  General: '💬',
  Fees: '💰',
  Services: '🦷',
  Emergency: '🚨',
  Timing: '🕐',
};

// ============================================================
// Component
// ============================================================

export default function KnowledgeCenter() {
  const [data, setData] = useState<KnowledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<FAQ | null>(null);

  // Form states
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ question: string; answer: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Clinic info states
  const [description, setDescription] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [importingSeed, setImportingSeed] = useState(false);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  // Fetch knowledge base data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/client/knowledge-base');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setDescription(json.clinicDescription || '');
        setSpecializations(json.specializations || '');
        setSpecialNotes(json.specialNotes || '');
      }
    } catch (err) {
      console.error('Fetch knowledge base error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter FAQs
  const filteredFaqs = (data?.faqs || []).filter((faq) => {
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Count FAQs per category
  const categoryCounts = (data?.faqs || []).reduce((acc, faq) => {
    acc[faq.category] = (acc[faq.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Knowledge gaps analysis
  const knowledgeGaps = (() => {
    const categories = ['General', 'Fees', 'Services', 'Emergency', 'Timing'];
    const gaps: { category: string; icon: string; message: string; severity: 'high' | 'medium' | 'low' }[] = [];

    categories.forEach(cat => {
      const count = categoryCounts[cat] || 0;
      if (count === 0) {
        gaps.push({
          category: cat,
          icon: CATEGORY_ICONS[cat],
          message: `No ${cat.toLowerCase()} FAQs added`,
          severity: cat === 'Emergency' ? 'high' : 'medium',
        });
      } else if (count < 2) {
        gaps.push({
          category: cat,
          icon: CATEGORY_ICONS[cat],
          message: `Only ${count} ${cat.toLowerCase()} FAQ(s) — add more for better AI responses`,
          severity: 'low',
        });
      }
    });

    if (!description) {
      gaps.push({ category: 'Clinic Info', icon: '🏥', message: 'No clinic description set — AI won\'t know about your clinic', severity: 'high' });
    }
    if (!specializations) {
      gaps.push({ category: 'Specializations', icon: '⭐', message: 'No specializations listed — helps AI recommend services', severity: 'medium' });
    }

    return gaps.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });
  })();

  const knowledgeScore = Math.min(100, Math.round(
    ((Object.keys(categoryCounts).length / 5) * 40) +
    (Math.min((data?.faqs || []).length, 10) / 10) * 30 +
    (description ? 15 : 0) +
    (specializations ? 15 : 0)
  ));

  // ── FAQ CRUD Operations ──

  const handleAddFaq = async () => {
    if (!formQuestion.trim() || !formAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/client/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: formQuestion, answer: formAnswer, category: formCategory }),
      });
      if (res.ok) {
        toast.success('FAQ added successfully');
        setAddDialogOpen(false);
        setFormQuestion('');
        setFormAnswer('');
        setFormCategory('General');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add FAQ');
      }
    } catch {
      toast.error('Failed to add FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleEditFaq = async () => {
    if (!selectedFaq || !formQuestion.trim() || !formAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/client/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-faq',
          faqId: selectedFaq.id,
          question: formQuestion,
          answer: formAnswer,
          category: formCategory,
        }),
      });
      if (res.ok) {
        toast.success('FAQ updated successfully');
        setEditDialogOpen(false);
        setSelectedFaq(null);
        setFormQuestion('');
        setFormAnswer('');
        setFormCategory('General');
        fetchData();
      } else {
        toast.error('Failed to update FAQ');
      }
    } catch {
      toast.error('Failed to update FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!selectedFaq) return;
    setSaving(true);
    try {
      const res = await fetch('/api/client/knowledge-base', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqId: selectedFaq.id }),
      });
      if (res.ok) {
        toast.success('FAQ deleted');
        setDeleteDialogOpen(false);
        setSelectedFaq(null);
        fetchData();
      } else {
        toast.error('Failed to delete FAQ');
      }
    } catch {
      toast.error('Failed to delete FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleImportSeed = async () => {
    setImportingSeed(true);
    try {
      const res = await fetch('/api/client/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-seed' }),
      });
      if (res.ok) {
        toast.success('Sample FAQs imported successfully!');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to import FAQs');
      }
    } catch {
      toast.error('Failed to import FAQs');
    } finally {
      setImportingSeed(false);
    }
  };

  const handleImportText = async () => {
    if (!importText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/client/knowledge-base/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(`${json.importedCount} FAQ(s) imported!`);
        setImportDialogOpen(false);
        setImportText('');
        setImportPreview([]);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to import');
      }
    } catch {
      toast.error('Failed to import');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInfo = async () => {
    setInfoSaving(true);
    try {
      const res = await fetch('/api/client/knowledge-base', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-info', clinicDescription: description, specializations, specialNotes }),
      });
      if (res.ok) {
        toast.success('Clinic info saved');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setInfoSaving(false);
    }
  };

  const handleExportJson = () => {
    if (!data?.faqs?.length) return;
    const blob = new Blob([JSON.stringify(data.faqs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceai-kb-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Knowledge base exported');
  };

  const openEditDialog = (faq: FAQ) => {
    setSelectedFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormCategory(faq.category);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (faq: FAQ) => {
    setSelectedFaq(faq);
    setDeleteDialogOpen(true);
  };

  // ── Import Preview ──

  const parseImportPreview = (text: string) => {
    const blocks = text.split(/(?=^[ \t]*(?:Q\d*\s*[:.]|Question\s*[:.]))/im);
    const faqs: { question: string; answer: string }[] = [];
    blocks.forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^(?:Q(?:\d+)?\s*[:.]\s*|Question\s*[:.]\s*)([\s\S]*?)(?:A(?:\d+)?\s*[:.]\s*|Answer\s*[:.]\s*)([\s\S]*)$/i);
      if (match && match[1].trim() && match[2].trim()) {
        faqs.push({ question: match[1].trim(), answer: match[2].trim() });
      }
    });
    setImportPreview(faqs);
  };

  // ── Loading Skeleton ──
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-shimmer-skeleton h-5 rounded-md w-1/3 mb-4" />
              <div className="animate-shimmer-skeleton h-4 rounded-md w-full mb-2" />
              <div className="animate-shimmer-skeleton h-4 rounded-md w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            Knowledge Base
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage FAQs, clinic info, and AI training data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJson} disabled={!data?.faqs?.length}>
            <Download className="w-4 h-4 mr-1.5" /> Export JSON
          </Button>
          <Button size="sm" onClick={() => setImportDialogOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add FAQ
          </Button>
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="faqs" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="faqs" className="gap-1.5">
            <HelpCircle className="w-4 h-4" /> FAQs ({data?.faqs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="clinic-info" className="gap-1.5">
            <FileText className="w-4 h-4" /> Clinic Info
          </TabsTrigger>
          <TabsTrigger value="ai-preview" className="gap-1.5">
            <Brain className="w-4 h-4" /> AI Preview
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════
            TAB 1: FAQ Management
        ════════════════════════════════════════════ */}
        <TabsContent value="faqs" className="space-y-4">
          {/* Knowledge Score Card */}
          <motion.div variants={item}>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${knowledgeScore * 1.51} 151`} className={knowledgeScore >= 70 ? 'text-emerald-500' : knowledgeScore >= 40 ? 'text-amber-500' : 'text-rose-500'} />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-300">
                        {knowledgeScore}%
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Knowledge Score</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(data?.faqs || []).length} FAQs across {Object.keys(categoryCounts).length} categories
                      </p>
                    </div>
                  </div>
                  {!data?.hasCustomFaqs && (data?.sampleFaqs || []).length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleImportSeed} disabled={importingSeed} className="gap-1.5">
                      <RefreshCw className={cn("w-3.5 h-3.5", importingSeed && "animate-spin")} />
                      {importingSeed ? 'Importing...' : 'Load Sample FAQs'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search & Filter */}
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={activeCategory === cat ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'text-xs',
                    activeCategory === cat && 'bg-emerald-500 hover:bg-emerald-600',
                  )}
                >
                  {cat !== 'All' && <span className="mr-1">{CATEGORY_ICONS[cat]}</span>}
                  {cat}
                  {cat !== 'All' && categoryCounts[cat] ? (
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">{categoryCounts[cat]}</Badge>
                  ) : null}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* FAQ List */}
          <motion.div variants={item} className="space-y-2">
            {filteredFaqs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No FAQs found</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    {searchQuery ? 'Try a different search term' : 'Add your first FAQ to help the AI answer patient questions'}
                  </p>
                  {!searchQuery && (
                    <Button size="sm" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1.5" /> Add FAQ
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredFaqs.map((faq) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
                    <CardContent className="p-0">
                      <div
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('text-[10px] px-2 py-0', CATEGORY_COLORS[faq.category] || CATEGORY_COLORS.General)}>
                              {CATEGORY_ICONS[faq.category] || '💬'} {faq.category}
                            </Badge>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {faq.question}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-emerald-600"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(faq); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(faq); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <ChevronDown className={cn(
                            "w-4 h-4 text-slate-400 transition-transform duration-200",
                            expandedFaq === faq.id && "rotate-180"
                          )} />
                        </div>
                      </div>
                      <AnimatePresence>
                        {expandedFaq === faq.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 ml-0 sm:ml-8 border-t border-slate-100 dark:border-slate-800 pt-3">
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                {faq.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </TabsContent>

        {/* ════════════════════════════════════════════
            TAB 2: Clinic Information
        ════════════════════════════════════════════ */}
        <TabsContent value="clinic-info" className="space-y-4">
          <motion.div variants={item}>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Clinic Description
                </CardTitle>
                <CardDescription>
                  Tell the AI about your clinic — this helps it answer general questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., Sharma Dental Clinic is a modern multi-specialty dental clinic in Andheri, Mumbai. Established in 2010, we provide comprehensive dental care including implants, braces, root canals, and cosmetic dentistry..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-teal-500" />
                  Specializations
                </CardTitle>
                <CardDescription>
                  List your specializations — comma separated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="e.g., Dental Implants, Orthodontics, Root Canal, Cosmetic Dentistry, Teeth Whitening"
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                />
                {specializations && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {specializations.split(',').map((s, i) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {s.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Special Instructions
                </CardTitle>
                <CardDescription>
                  Any special notes for the AI agent — handling instructions, preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., Always ask for patient's full name before booking. For emergency calls, transfer immediately to Dr. Sharma at +91 98765 43210. Do not book appointments on Sundays unless it's an emergency."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveInfo}
              disabled={infoSaving}
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {infoSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════
            TAB 3: AI Knowledge Preview
        ════════════════════════════════════════════ */}
        <TabsContent value="ai-preview" className="space-y-4">
          {/* Knowledge Score */}
          <motion.div variants={item}>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center",
                    knowledgeScore >= 70 ? "bg-emerald-100 dark:bg-emerald-900/30" : knowledgeScore >= 40 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-rose-100 dark:bg-rose-900/30"
                  )}>
                    <Brain className={cn(
                      "w-8 h-8",
                      knowledgeScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : knowledgeScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      AI Knowledge Assessment
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {knowledgeScore >= 70 ? '✅ Good knowledge base!' : knowledgeScore >= 40 ? '⚠️ Needs improvement' : '❌ Significant gaps detected'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      knowledgeScore >= 70 ? "bg-gradient-to-r from-emerald-500 to-teal-500" : knowledgeScore >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-rose-400 to-rose-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${knowledgeScore}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-slate-400">{knowledgeScore}/100 knowledge score</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* What AI Knows */}
          <motion.div variants={item}>
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  What the AI Knows
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {CATEGORIES.filter(c => c !== 'All').map(cat => {
                    const count = categoryCounts[cat] || 0;
                    return (
                      <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CATEGORY_ICONS[cat]}</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {count > 0 ? (
                            <>
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                                {count} FAQ{count > 1 ? 's' : ''}
                              </Badge>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs">None</Badge>
                              <X className="w-4 h-4 text-rose-400" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏥</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Clinic Description</span>
                    </div>
                    {description ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">Set</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Missing</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⭐</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Specializations</span>
                    </div>
                    {specializations ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                        {specializations.split(',').filter(s => s.trim()).length} items
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Missing</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Knowledge Gaps */}
          {knowledgeGaps.length > 0 && (
            <motion.div variants={item}>
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Knowledge Gaps
                    <Badge variant="secondary" className="text-xs">{knowledgeGaps.length}</Badge>
                  </CardTitle>
                  <CardDescription>Improve these areas for better AI responses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {knowledgeGaps.map((gap, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg",
                          gap.severity === 'high' ? "bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800" :
                          gap.severity === 'medium' ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" :
                          "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <span className="text-lg">{gap.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 dark:text-slate-300">{gap.message}</p>
                        </div>
                        <Badge className={cn(
                          "text-[10px]",
                          gap.severity === 'high' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                          gap.severity === 'medium' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                        )}>
                          {gap.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════ */}

      {/* Add FAQ Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" /> Add New FAQ
            </DialogTitle>
            <DialogDescription>Add a question-answer pair to help the AI agent respond to patients</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Question *</label>
              <Textarea
                placeholder="e.g., Appointment kaise book karein?"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Answer *</label>
              <Textarea
                placeholder="e.g., Aap hamari clinic mein appointment book karne ke liye..."
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFaq} disabled={saving || !formQuestion.trim() || !formAnswer.trim()} className="bg-emerald-500 hover:bg-emerald-600">
              {saving ? 'Adding...' : 'Add FAQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-500" /> Edit FAQ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Question</label>
              <Textarea value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} className="min-h-[80px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Answer</label>
              <Textarea value={formAnswer} onChange={(e) => setFormAnswer(e.target.value)} className="min-h-[120px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditFaq} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete FAQ Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> Delete FAQ
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedFaq && (
            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
              <strong>Q:</strong> {selectedFaq.question}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteFaq} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import FAQ Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) { setImportText(''); setImportPreview([]); }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-500" /> Import FAQs
            </DialogTitle>
            <DialogDescription>Paste Q&A pairs in text format to bulk import</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Paste Q&A pairs</label>
              <p className="text-xs text-slate-400 mb-2">Format: Q: [question] A: [answer] — one pair per block</p>
              <Textarea
                placeholder={"Q: Appointment kaise book karein?\nA: Aap hamari clinic mein appointment book karne ke liye...\n\nQ: Consultation fee kya hai?\nA: Hamara consultation fee ₹500 se start hota hai."}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  parseImportPreview(e.target.value);
                }}
                className="min-h-[180px] font-mono text-xs"
              />
            </div>

            {/* Import Preview */}
            {importPreview.length > 0 && (
              <div className="border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Preview: {importPreview.length} FAQ(s) detected
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {importPreview.map((faq, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-medium text-slate-700 dark:text-slate-300">Q: {faq.question}</p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">A: {faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importText && importPreview.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                No valid Q&A pairs found. Make sure to use "Q:" and "A:" format.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleImportText}
              disabled={saving || importPreview.length === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {saving ? 'Importing...' : `Import ${importPreview.length} FAQ(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
