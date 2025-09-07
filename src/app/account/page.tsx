"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SubscriptionInfo } from '@/components/subscription-info';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Mail, Lock, Briefcase, Globe, CheckCircle, AlertCircle, Calendar, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const JOB_TITLES = [
  { value: 'tax_accountant', label: 'Tax Accountant' },
  { value: 'tax_consultant', label: 'Tax Consultant' },
  { value: 'tax_auditor_gov', label: 'Tax Auditor (Government)' },
  { value: 'tax_auditor_firm', label: 'Tax Auditor (Firm)' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'tax_manager', label: 'Tax Manager' },
  { value: 'tax_investigator', label: 'Tax Investigator' },
  { value: 'tax_attorney', label: 'Tax Attorney' },
  { value: 'fiscal_policy_analyst', label: 'Fiscal Policy Analyst' },
  { value: 'tax_staff', label: 'Tax Staff' },
  { value: 'tax_educator', label: 'Tax Educator' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES = [
  { value: 'english', label: 'English', flag: '🇺🇸' },
  { value: 'arabic', label: 'العربية', flag: '🇸🇦' },
  { value: 'chinese', label: '中文', flag: '🇨🇳' },
];

export default function AccountPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [language, setLanguage] = useState('');
  const [trialUsed, setTrialUsed] = useState(false);
  const [createdAt, setCreatedAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [subscription, setSubscription] = useState<{
    type?: string;
    status?: string;
    messageLimit?: number;
    remainingMessages?: number;
    callSeconds?: number;
    startDate?: string | Date;
    endDate?: string | Date;
    payment?: {
      amount?: number;
      method?: string;
      lastPaymentDate?: string | Date;
      nextPaymentDate?: string | Date;
    };
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/me', { cache: 'no-store' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        console.log('User data from API:', data); // Debug log
        
        setName(data.name || '');
        setEmail(data.email || '');
        setJobTitle(data.jobTitle || '');
        setLanguage(data.language || '');
        setTrialUsed(data.trialUsed || false);
        setCreatedAt(data.createdAt || '');
        setUpdatedAt(data.updatedAt || '');
        setSubscription(data.subscription || session?.user?.subscription || null);
      } catch {
        setMessage('Failed to load profile');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, session]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: password || undefined, jobTitle, language }),
      });
      if (!res.ok) throw new Error('Update failed');
      setPassword('');
      setMessage('Profile updated successfully');
      setMessageType('success');
      // Refresh session info shown in UI
      try {
        const { signIn } = await import('next-auth/react');
        await signIn('credentials', { email, password: password || undefined, redirect: false });
      } catch {}
    } catch {
      setMessage('Failed to update profile');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      {/* Subscription Card */}
      <SubscriptionInfo subscription={subscription} />

      {/* Account Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Account Status
          </CardTitle>
          <CardDescription>
            Your account verification and trial information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Email Verification</span>
              </div>
              <Badge variant="default">
                Verified
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Trial Status</span>
              </div>
              <Badge variant={trialUsed ? "secondary" : "default"}>
                {trialUsed ? "Used" : "Available"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Profile Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Current Profile Summary
          </CardTitle>
          <CardDescription>
            Your current job title and language preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Job Title</Label>
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {jobTitle ? JOB_TITLES.find(job => job.value === jobTitle)?.label || jobTitle : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Language</Label>
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    {language ? LANGUAGES.find(lang => lang.value === language)?.label || language : 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Account History
          </CardTitle>
          <CardDescription>
            Important dates and account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Account Created</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-muted-foreground">
                  {createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Not available'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Last Updated</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-muted-foreground">
                  {updatedAt ? new Date(updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Not available'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            {/* Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
              />
              <p className="text-sm text-muted-foreground">
                Leave this field empty if you don&apos;t want to change your password
              </p>
            </div>

            {/* Job Title and Language Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Job Title
                </Label>
                <Select value={jobTitle} onValueChange={setJobTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your job title" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map((job) => (
                      <SelectItem key={job.value} value={job.value}>
                        {job.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Preferred Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {message && (
                  <Alert className={messageType === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                    {messageType === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={messageType === 'success' ? 'text-green-800' : 'text-red-800'}>
                      {message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Button type="submit" disabled={saving} className="min-w-[120px]">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}