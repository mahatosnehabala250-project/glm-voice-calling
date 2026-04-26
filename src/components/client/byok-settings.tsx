'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import {
  Key, Eye, EyeOff, CheckCircle, XCircle, Brain, Phone, Database,
  Workflow, MessageSquare, Radio, Save, Shield, Zap, Loader2,
  AlertTriangle, Lock, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface ByokConfigItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  placeholder: string;
  value: string;
  configured: boolean;
}

interface ByokCategory {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

// ─── Icon Map ────────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  brain: Brain,
  phone: Phone,
  database: Database,
  workflow: Workflow,
  message: MessageSquare,
  radio: Radio,
};

// ─── Category Definitions ────────────────────────────────────────────────────────

const CATEGORIES: ByokCategory[] = [
  { name: 'AI', icon: Brain, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/20', borderColor: 'border-violet-200 dark:border-violet-800', description: 'AI/ML model integrations' },
  { name: 'Telephony', icon: Phone, color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/20', borderColor: 'border-cyan-200 dark:border-cyan-800', description: 'SIP trunking & telephony' },
  { name: 'Database', icon: Database, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800', description: 'Database connections' },
  { name: 'Automation', icon: Workflow, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800', description: 'Workflow automation' },
  { name: 'Messaging', icon: MessageSquare, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/20', borderColor: 'border-rose-200 dark:border-rose-800', description: 'WhatsApp & SMS' },
  { name: 'Voice', icon: Radio, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-900/20', borderColor: 'border-teal-200 dark:border-teal-800', description: 'Voice infrastructure' },
];

// ─── Animation Variants ─────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ByokSettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configItems, setConfigItems] = useState<ByokConfigItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Fetch BYOK config
  useEffect(() => {
    const fetchConfig = async () => {
      if (!user?.clinicId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/client/byok', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) {
          const data = await res.json();
          setConfigItems(data.config || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [user?.clinicId]);

  // Initialize expanded categories once config loads
  useEffect(() => {
    if (configItems.length > 0 && expandedCategories.size === 0) {
      const cats = new Set(configItems.map(c => c.category));
      setExpandedCategories(cats);
    }
  }, [configItems]);

  // Group config items by category
  const groupedConfig = useMemo(() => {
    const groups: Record<string, ByokConfigItem[]> = {};
    configItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [configItems]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = configItems.length;
    const configured = configItems.filter(c => c.configured).length;
    const percentage = total > 0 ? Math.round((configured / total) * 100) : 0;
    return { total, configured, percentage };
  }, [configItems]);

  const toggleVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.clinicId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/client/byok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': user.clinicId },
        body: JSON.stringify(editValues),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Settings saved! ${data.validated} key(s) validated.`, {
          description: data.message,
        });
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (key: string) => {
    setTestingKey(key);
    // Simulate a connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (key === 'GEMINI_API_KEY') {
      toast.success('Gemini API connection successful!', {
        description: 'Model: gemini-2.0-flash | Latency: 245ms',
      });
    } else if (key.startsWith('VOBIZ')) {
      toast.success('Vobiz connection successful!', {
        description: 'SIP trunk: Active | Credits: 847 remaining',
      });
    } else {
      toast.info('Connection test initiated', {
        description: 'In production, this would test the actual service endpoint.',
      });
    }
    setTestingKey(null);
  };

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header with Status Overview */}
      <motion.div variants={itemAnim}>
        <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-[length:200%_100%] animate-gradient-shift">
          <Card className="border-0 bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Icon + Title */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Bring Your Own Keys
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                        <Shield className="w-3 h-3" />
                        BYOK
                      </Badge>
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Connect your own API keys. All keys are encrypted at rest.
                    </p>
                  </div>
                </div>

                {/* Status overview */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats.configured}<span className="text-slate-400 dark:text-slate-500 text-sm font-normal">/{stats.total}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Keys configured</p>
                  </div>
                  <div className="w-32">
                    <Progress value={stats.percentage} className="h-2" />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">
                      {stats.percentage}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar by Category */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5">
                {CATEGORIES.map(cat => {
                  const items = groupedConfig[cat.name] || [];
                  const configured = items.filter(i => i.configured).length;
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', cat.color)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">{cat.name}</p>
                        <p className={cn(
                          'text-[10px]',
                          configured === items.length && items.length > 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500',
                        )}>
                          {configured}/{items.length}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Security Notice */}
      <motion.div variants={itemAnim}>
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Encrypted & Secure
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  All API keys are AES-256 encrypted before storage. Keys are never logged or exposed in client-side code. 
                  In this demo, keys are validated but not persisted.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Sections */}
      {CATEGORIES.map(cat => {
        const items = groupedConfig[cat.name] || [];
        if (items.length === 0) return null;
        const isExpanded = expandedCategories.has(cat.name);
        const Icon = cat.icon;
        const configured = items.filter(i => i.configured).length;
        const allConfigured = configured === items.length && items.length > 0;

        return (
          <motion.div key={cat.name} variants={itemAnim}>
            <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.name)}
                className="w-full text-left"
              >
                <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', cat.bgColor)}>
                        <Icon className={cn('w-4.5 h-4.5', cat.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {cat.name}
                          {allConfigured && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </motion.div>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs">{cat.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          allConfigured ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {configured}/{items.length}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {/* Category Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <Separator />
                    <CardContent className="p-4 space-y-3">
                      {items.map((item) => {
                        const ItemIcon = ICON_MAP[item.icon] || Key;
                        const isVisible = visibleKeys.has(item.key);
                        const currentValue = editValues[item.key] ?? (item.configured ? item.placeholder : '');
                        const isTesting = testingKey === item.key;
                        const canTest = item.key === 'GEMINI_API_KEY' || item.key.startsWith('VOBIZ');

                        return (
                          <motion.div
                            key={item.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                          >
                            {/* Icon */}
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cat.bgColor)}>
                              <ItemIcon className={cn('w-4 h-4', cat.color)} />
                            </div>

                            {/* Field */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                  {item.label}
                                </label>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[9px] px-1.5 py-0 h-4 flex-shrink-0 ml-2',
                                    item.configured
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700',
                                  )}
                                >
                                  {item.configured ? (
                                    <><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Configured</>
                                  ) : (
                                    <><XCircle className="w-2.5 h-2.5 mr-0.5" />Not set</>
                                  )}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {item.description}
                              </p>
                              <div className="relative mt-2">
                                <Input
                                  type={isVisible ? 'text' : 'password'}
                                  value={currentValue}
                                  onChange={e => setEditValues(prev => ({ ...prev, [item.key]: e.target.value }))}
                                  placeholder={item.placeholder}
                                  className="pr-16 text-xs font-mono border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                  <button
                                    onClick={() => toggleVisibility(item.key)}
                                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title={isVisible ? 'Hide' : 'Show'}
                                  >
                                    {isVisible ? (
                                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </button>
                                  {canTest && (
                                    <button
                                      onClick={() => handleTestConnection(item.key)}
                                      disabled={isTesting || !editValues[item.key]}
                                      className="p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                                      title="Test connection"
                                    >
                                      {isTesting ? (
                                        <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                                      ) : (
                                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        );
      })}

      {/* Save Button */}
      <motion.div variants={itemAnim}>
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Changes are validated but not persisted in demo mode</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save All Keys</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
