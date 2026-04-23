'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import {
  Settings as SettingsIcon, Save, Loader2, Plus, X, Building2, Clock, Globe, MessageSquare, Phone,
  Bot, User, Sparkles, Volume2, ShieldCheck, Circle, AlertTriangle, CheckCircle2,
  Mic, Play, ChevronRight, Zap, VolumeX, Send
} from 'lucide-react';
import WeeklySchedule from '@/components/client/weekly-schedule';
import TeamMembers from '@/components/client/team-members';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClinicSettings {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  businessHours: string;
  businessDays: string;
  services: string[];
  consultationFee: string | null;
  whatsappNumber: string | null;
  escalationNumber: string | null;
  language: string;
  greetingMessage: string | null;
  sipNumber: string | null;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PROFILE_FIELDS: { key: keyof ClinicSettings; label: string; description: string }[] = [
  { key: 'name', label: 'Clinic Name', description: 'Your clinic name' },
  { key: 'doctorName', label: 'Doctor Name', description: 'Primary doctor name' },
  { key: 'email', label: 'Email', description: 'Contact email' },
  { key: 'phone', label: 'Phone', description: 'Clinic phone number' },
  { key: 'address', label: 'Address', description: 'Clinic address' },
  { key: 'city', label: 'City', description: 'City' },
  { key: 'state', label: 'State', description: 'State' },
  { key: 'pincode', label: 'Pincode', description: 'Area pincode' },
  { key: 'services', label: 'Services', description: 'At least one service' },
  { key: 'consultationFee', label: 'Consultation Fee', description: 'Consultation fee' },
  { key: 'whatsappNumber', label: 'WhatsApp Number', description: 'For patient notifications' },
  { key: 'escalationNumber', label: 'Escalation Number', description: 'Human handoff number' },
  { key: 'greetingMessage', label: 'Greeting Message', description: 'AI greeting template' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const SAMPLE_GREETINGS: Record<string, { name: string; greeting: string }> = {
  hinglish: {
    name: 'Rekha',
    greeting: 'Namaste! {clinicName} mein aapka swagat hai. Main Rekha hoon, Dr. {doctorName} ki clinic se. Kaise madad kar sakti hoon aapki?',
  },
  english: {
    name: 'Sarah',
    greeting: 'Hello! Welcome to {clinicName}. This is Sarah speaking from Dr. {doctorName}\'s clinic. How may I help you today?',
  },
  hindi: {
    name: 'Priya',
    greeting: 'नमस्ते! {clinicName} में आपका स्वागत है। मैं प्रिया हूँ, डॉ. {doctorName} की क्लिनिक से। मैं आपकी कैसे मदद कर सकती हूँ?',
  },
};

const VOICE_OPTIONS = [
  { id: 'priya', name: 'Priya', gender: 'female' as const, language: 'Hindi Female' },
  { id: 'sarah', name: 'Sarah', gender: 'female' as const, language: 'English Female' },
  { id: 'amit', name: 'Amit', gender: 'male' as const, language: 'Hindi Male' },
];

export default function ClientSettings() {
  const { user } = useAuthStore();
  const { setClientPage } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState('');
  const [isPhoneHovered, setIsPhoneHovered] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('priya');
  const [aiTestOpen, setAiTestOpen] = useState(false);
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestResponse, setAiTestResponse] = useState<string | null>(null);
  const [aiTestBackend, setAiTestBackend] = useState('demo');

  const [form, setForm] = useState<ClinicSettings>({
    id: '', name: '', doctorName: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    businessHours: '09:00-18:00', businessDays: 'Mon-Fri',
    services: [], consultationFee: '',
    whatsappNumber: '', escalationNumber: '',
    language: 'hinglish', greetingMessage: '',
    sipNumber: null,
  });

  useEffect(() => {
    if (!user?.clinicId) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/client/settings', {
          headers: { 'x-clinic-id': user.clinicId },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.clinic) setForm({ ...form, ...data.clinic });
        }
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    fetchSettings();
  }, [user?.clinicId]);

  const handleSave = async () => {
    if (!user?.clinicId) return;
    setSaving(true);
    try {
      const { id, sipNumber, ...updateData } = form;
      const res = await fetch('/api/client/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-clinic-id': user.clinicId },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    }
    finally { setSaving(false); }
  };

  const addService = () => {
    if (newService.trim() && !form.services.includes(newService.trim())) {
      setForm({ ...form, services: [...form.services, newService.trim()] });
      setNewService('');
    }
  };

  // AI Test functions
  const runAiTest = useCallback(async () => {
    setAiTestLoading(true);
    setAiTestResponse(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: 'Hello, I want to book an appointment for tomorrow.',
          clinicContext: {
            clinicName: form.name || 'Test Clinic',
            doctorName: form.doctorName || 'Dr. Sharma',
            language: form.language,
            services: form.services.length > 0 ? form.services : ['General Consultation'],
            fee: form.consultationFee || '₹500',
          },
        }),
      });
      const data = await res.json();
      setAiTestResponse(data.response || 'No response received.');
      setAiTestBackend(data.backend || 'demo');
    } catch {
      setAiTestResponse('Namaste! Aapka appointment book karne ke liye, mujhe aapka naam aur preferred date chahiye. Kaunsa date suit karega aapko?');
      setAiTestBackend('demo-fallback');
    } finally {
      setAiTestLoading(false);
    }
  }, [form.name, form.doctorName, form.language, form.services, form.consultationFee]);

  const handleVoicePreview = useCallback((voiceId: string) => {
    const voice = VOICE_OPTIONS.find(v => v.id === voiceId);
    if (voice) {
      toast.info(`Previewing ${voice.name} (${voice.language}) voice. Full TTS preview coming soon!`);
      setSelectedVoice(voiceId);
    }
  }, []);

  const removeService = (service: string) => {
    setForm({ ...form, services: form.services.filter(s => s !== service) });
  };

  const parseDays = (days: string): string[] => {
    if (!days) return [];
    if (days === 'Mon-Sun') return ALL_DAYS;
    if (days === 'Mon-Fri') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    if (days === 'Mon-Sat') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.split(',');
  };

  const toggleDay = (day: string) => {
    const current = parseDays(form.businessDays);
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
    setForm({ ...form, businessDays: updated.join(',') || 'Mon-Fri' });
  };

  // AI Agent Preview derived from form state
  const aiPreview = useMemo(() => {
    const langConfig = SAMPLE_GREETINGS[form.language] || SAMPLE_GREETINGS.hinglish;
    const greetingTemplate = form.greetingMessage || langConfig.greeting;
    // Strip any existing "Dr." prefix from doctorName before inserting into
    // templates that already include "Dr." to avoid "Dr. Dr. Rajesh Sharma"
    const cleanDoctorName = (form.doctorName || 'the doctor').replace(/^Dr\.?\s*/i, '').trim() || 'the doctor';
    const personalizedGreeting = greetingTemplate
      .replace('{clinicName}', form.name || 'our clinic')
      .replace('{doctorName}', cleanDoctorName);

    return {
      agentName: langConfig.name,
      greeting: personalizedGreeting,
      services: form.services.length > 0 ? form.services : ['General Consultation'],
    };
  }, [form.language, form.greetingMessage, form.name, form.doctorName, form.services]);

  // Profile completeness calculation
  const profileCompleteness = useMemo(() => {
    let filled = 0;
    const incompleteItems: string[] = [];

    PROFILE_FIELDS.forEach(({ key, label }) => {
      const value = form[key];
      let isFilled = false;
      if (key === 'services') {
        isFilled = Array.isArray(value) && value.length > 0;
      } else {
        isFilled = !!value && value !== '';
      }
      if (isFilled) {
        filled++;
      } else {
        incompleteItems.push(label);
      }
    });

    const percentage = Math.round((filled / PROFILE_FIELDS.length) * 100);
    return { percentage, incompleteItems, filled };
  }, [form]);

  const completenessColor = profileCompleteness.percentage > 80
    ? 'emerald'
    : profileCompleteness.percentage >= 50
    ? 'amber'
    : 'rose';

  // Section completeness checks
  const clinicInfoComplete = !!(form.name && form.doctorName && form.email && form.phone && form.address && form.city && form.state && form.pincode);
  const servicesComplete = form.services.length > 0 && !!form.consultationFee;
  const aiConfigComplete = !!form.greetingMessage;
  const escalationComplete = !!(form.escalationNumber && form.whatsappNumber);

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const SectionTitle = ({ icon: Icon, title, completed }: { icon: React.ElementType; title: string; completed?: boolean }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-emerald-500" />
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      {completed !== undefined && (
        completed ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </motion.div>
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600" />
        )
      )}
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Profile Completeness */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              {/* Circular Progress */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(${
                      completenessColor === 'emerald' ? '#10b981' : completenessColor === 'amber' ? '#f59e0b' : '#f43f5e'
                    } ${profileCompleteness.percentage * 3.6}deg, hsl(var(--muted)) ${profileCompleteness.percentage * 3.6}deg)`,
                  }}
                >
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                    <span className={cn(
                      'text-lg font-bold',
                      completenessColor === 'emerald' && 'text-emerald-600 dark:text-emerald-400',
                      completenessColor === 'amber' && 'text-amber-600 dark:text-amber-400',
                      completenessColor === 'rose' && 'text-rose-600 dark:text-rose-400'
                    )}>
                      {profileCompleteness.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className={cn(
                    'w-4 h-4',
                    completenessColor === 'emerald' && 'text-emerald-500',
                    completenessColor === 'amber' && 'text-amber-500',
                    completenessColor === 'rose' && 'text-rose-500'
                  )} />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Profile Completeness</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {profileCompleteness.percentage === 100
                    ? 'Your profile is complete! All fields are filled.'
                    : `${profileCompleteness.filled} of ${PROFILE_FIELDS.length} fields completed`}
                </p>

                {profileCompleteness.percentage < 100 && (
                  <div className="space-y-1.5">
                    {profileCompleteness.incompleteItems.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs">
                        <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        <span className="text-slate-500 dark:text-slate-400">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {profileCompleteness.percentage < 100 && (
                  <Button
                    size="sm"
                    className={cn(
                      'mt-3 text-white',
                      completenessColor === 'rose' && 'bg-rose-500 hover:bg-rose-600',
                      completenessColor === 'amber' && 'bg-amber-500 hover:bg-amber-600',
                      completenessColor === 'emerald' && 'bg-emerald-500 hover:bg-emerald-600'
                    )}
                  >
                    Complete your profile
                    {profileCompleteness.percentage < 50 && (
                      <AlertTriangle className="w-3.5 h-3.5 ml-1.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Clinic Info */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <SectionTitle icon={Building2} title="Clinic Information" completed={clinicInfoComplete} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Clinic Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Doctor Name</Label>
                <Input
                  value={form.doctorName}
                  onChange={e => setForm({ ...form, doctorName: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-700 dark:text-slate-300">Address</Label>
                <Input
                  value={form.address || ''}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                  placeholder="Full address"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">City</Label>
                <Input
                  value={form.city || ''}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">State</Label>
                <Input
                  value={form.state || ''}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Pincode</Label>
                <Input
                  value={form.pincode || ''}
                  onChange={e => setForm({ ...form, pincode: e.target.value })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Business Hours */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <SectionTitle icon={Clock} title="Business Hours" completed={true} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Start Time</Label>
                <Input
                  type="time"
                  value={form.businessHours.split('-')[0] || '09:00'}
                  onChange={e => setForm({ ...form, businessHours: `${e.target.value}-${form.businessHours.split('-')[1] || '18:00'}` })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">End Time</Label>
                <Input
                  type="time"
                  value={form.businessHours.split('-')[1] || '18:00'}
                  onChange={e => setForm({ ...form, businessHours: `${form.businessHours.split('-')[0] || '09:00'}-${e.target.value}` })}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-slate-700 dark:text-slate-300">Business Days</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                      parseDays(form.businessDays).includes(day)
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Services */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <SectionTitle icon={SettingsIcon} title="Services & Fee" completed={servicesComplete} />
            <div className="space-y-3">
              <Label className="text-slate-700 dark:text-slate-300">Services Offered</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.services.map(service => (
                  <Badge key={service} variant="secondary" className="px-2.5 py-1 text-xs gap-1">
                    {service}
                    <button onClick={() => removeService(service)} className="hover:text-rose-600 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newService}
                  onChange={e => setNewService(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addService())}
                  placeholder="Add a service (e.g. Root Canal)"
                  className="border-slate-200 dark:border-slate-700 flex-1"
                />
                <Button
                  variant="outline"
                  onClick={addService}
                  className="border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-slate-700 dark:text-slate-300">Consultation Fee (₹)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                <Input
                  value={form.consultationFee || ''}
                  onChange={e => setForm({ ...form, consultationFee: e.target.value })}
                  placeholder="500"
                  className="pl-7 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Configuration */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">AI Configuration</h3>
                {aiConfigComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600" />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiTestOpen(true)}
                className="border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 gap-1.5 text-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                Test Your AI Agent
              </Button>
            </div>

            {/* Voice Preview Section */}
            <div className="mb-4">
              <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Voice Preview</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                {VOICE_OPTIONS.map((voice) => (
                  <motion.button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={cn(
                      'relative p-3 rounded-xl border-2 text-left transition-all duration-200 group',
                      selectedVoice === voice.id
                        ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-md shadow-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {selectedVoice === voice.id && (
                      <motion.div
                        layoutId="voiceSelectRing"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                        voice.gender === 'female'
                          ? 'bg-pink-100 dark:bg-pink-900/20'
                          : 'bg-sky-100 dark:bg-sky-900/20'
                      )}>
                        <User className={cn(
                          'w-5 h-5',
                          voice.gender === 'female'
                            ? 'text-pink-600 dark:text-pink-400'
                            : 'text-sky-600 dark:text-sky-400'
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{voice.name}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          {voice.language}
                        </p>
                      </div>
                    </div>
                    {/* Mini waveform preview */}
                    <div className="flex items-center gap-[2px] h-4 mt-2.5">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={cn(
                            'w-[2px] rounded-full',
                            selectedVoice === voice.id ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'
                          )}
                          animate={selectedVoice === voice.id ? {
                            height: [2, Math.random() * 12 + 4, 2],
                          } : { height: 2 }}
                          transition={selectedVoice === voice.id ? {
                            duration: 0.6 + Math.random() * 0.4,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                            delay: i * 0.03,
                          } : { duration: 0.2 }}
                        />
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 h-7 text-[10px] gap-1 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                      onClick={(e) => { e.stopPropagation(); handleVoicePreview(voice.id); }}
                    >
                      <Play className="w-2.5 h-2.5" />
                      Preview
                    </Button>
                  </motion.button>
                ))}
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Language</Label>
                <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                  <SelectTrigger className="border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hinglish">Hinglish</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-slate-700 dark:text-slate-300">Custom Greeting Message</Label>
              <Textarea
                value={form.greetingMessage || ''}
                onChange={e => setForm({ ...form, greetingMessage: e.target.value })}
                placeholder="Namaste! Welcome to [Clinic Name]. How can I help you today?"
                className="border-slate-200 dark:border-slate-700 mt-1.5 resize-none"
                rows={3}
              />
              <p className="text-xs text-slate-400 mt-1">Leave empty to use the default greeting for the selected language</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick AI Test Dialog */}
      <Dialog open={aiTestOpen} onOpenChange={setAiTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              Quick AI Agent Test
            </DialogTitle>
            <DialogDescription>
              Send a sample greeting and see how your AI agent responds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Sample greeting message */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <User className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">You (Patient)</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">"Hello, I want to book an appointment for tomorrow."</p>
            </div>

            {/* AI Response */}
            {aiTestLoading ? (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Bot className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{aiPreview.agentName} (AI)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">AI is thinking...</span>
                </div>
              </div>
            ) : aiTestResponse ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-3"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Bot className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{aiPreview.agentName} (AI)</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto">
                    {aiTestBackend}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{aiTestResponse}</p>
              </motion.div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-center">
                <Bot className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-400">Press &quot;Send Test&quot; to see AI response</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setAiTestOpen(false); setAiTestResponse(null); }}
                className="flex-1 text-xs"
              >
                Close
              </Button>
              <Button
                onClick={runAiTest}
                disabled={aiTestLoading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs"
              >
                {aiTestLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
                ) : (
                  <><Send className="w-3.5 h-3.5 mr-1.5" />Send Test</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Agent Preview Card */}
      <motion.div variants={itemAnim}>
        <div className="relative p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 bg-[length:200%_100%] animate-gradient-shift">
          <Card className="border-0 bg-white dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                AI Agent Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Simulated phone call interface - realistic phone */}
              <div
                className="relative mx-auto max-w-[260px] rounded-[2rem] bg-gradient-to-b from-slate-900 to-slate-800 p-1 shadow-2xl"
                onMouseEnter={() => setIsPhoneHovered(true)}
                onMouseLeave={() => setIsPhoneHovered(false)}
              >
                {/* Phone outer shell */}
                <div className="rounded-[1.75rem] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 overflow-hidden">
                  {/* Notch */}
                  <div className="relative flex items-center justify-center h-7 bg-slate-900">
                    <div className="absolute left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-2xl flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-slate-800 ring-1 ring-slate-700" />
                    </div>
                  </div>

                  {/* Phone content */}
                  <div className="px-4 pb-4 pt-2 text-white">
                    {/* Phone status bar */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-slate-400 font-medium">9:41</span>
                      <div className="flex items-center gap-1">
                        {/* Pulsing AI Active badge */}
                        <motion.div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 ai-badge-pulse"
                          animate={isPhoneHovered ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-semibold text-emerald-400 tracking-wide">AI ACTIVE</span>
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3 h-3 text-slate-400" />
                        <Phone className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>

                    {/* Agent avatar and info */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-2 ring-4 ring-emerald-500/20">
                        <Bot className="w-7 h-7 text-white" />
                      </div>
                      <h4 className="font-semibold text-white text-sm">{aiPreview.agentName} from {form.name || 'Your Clinic'}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        AI Receptionist
                      </p>
                    </div>

                    {/* Waveform animation */}
                    <div className="flex items-center justify-center gap-[3px] h-8 my-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className={cn(
                            'w-[3px] rounded-full bg-emerald-400 transition-colors',
                            isPhoneHovered ? 'wave-bar-anim' : ''
                          )}
                          style={{
                            height: isPhoneHovered ? undefined : '3px',
                            backgroundColor: isPhoneHovered ? '#34d399' : 'rgba(100,116,139,0.3)',
                          }}
                          animate={isPhoneHovered ? undefined : {}}
                        />
                      ))}
                    </div>

                    {/* Simulated conversation bubble */}
                    <div className="bg-slate-700/50 rounded-2xl rounded-tl-sm p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-[9px] font-medium text-emerald-400">{aiPreview.agentName}</span>
                        <span className="text-[9px] text-slate-500">now</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed line-clamp-3">{aiPreview.greeting}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services the AI can book */}
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Services AI Can Book
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiPreview.services.map((service, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Language indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Globe className="w-3.5 h-3.5" />
                <span>AI Language: <strong className="text-slate-700 dark:text-slate-300 capitalize">{form.language}</strong></span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>Updates in real-time as you change settings</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Escalation */}
      <motion.div variants={itemAnim}>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <SectionTitle icon={Phone} title="Escalation & Notifications" completed={escalationComplete} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Escalation Number</Label>
                <Input
                  value={form.escalationNumber || ''}
                  onChange={e => setForm({ ...form, escalationNumber: e.target.value })}
                  placeholder="919876543210 (when AI can't handle)"
                  className="border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">WhatsApp Number</Label>
                <Input
                  value={form.whatsappNumber || ''}
                  onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                  placeholder="919876543210 (for patient notifications)"
                  className="border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Availability Calendar */}
      <motion.div variants={itemAnim}>
        <WeeklySchedule businessDays={parseDays(form.businessDays)} businessHours={form.businessHours} />
      </motion.div>

      {/* Team Members */}
      <motion.div variants={itemAnim}>
        <TeamMembers />
      </motion.div>

      {/* Save Button */}
      <motion.div variants={itemAnim} className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 px-8 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}
