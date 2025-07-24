'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import Link from 'next/link';
import { useI18n } from './i18n-provider';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from './language-switcher';

const jobTitles = [
  'tax_accountant',
  'tax_consultant',
  'tax_auditor_gov',
  'tax_manager',
  'tax_investigator',
  'tax_attorney',
  'fiscal_policy_analyst',
  'tax_staff',
  'tax_auditor_firm',
  'tax_educator',
  'other'
] as const;

const authSchema = z.object({
  email: z.string().email('error_email'),
  password: z.string().min(6, 'error_password_length'),
  name: z.string().min(3, 'error_name_length').optional(),
  jobTitle: z.enum(jobTitles, {
    required_error: 'error_select_job_title',
  }).optional(),
});

type AuthFormType = 'login' | 'register';

interface AuthFormProps {
  type: AuthFormType;
}

export function AuthForm({ type }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
      name: type === 'register' ? '' : undefined,
      jobTitle: type === 'register' ? undefined : undefined,
    },
  });

  const onSubmit = async (data: z.infer<typeof authSchema>) => {
    try {
      setError(null);
      setLoading(true);

      if (type === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Registration failed');
        }
      }

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push('/chat');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2 justify-end items-center w-full pr-2">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">
          {type === 'login' ? t('sign_in') : t('create_account')}
        </h2>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {type === 'register' && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('name')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('job_title')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_job_title')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jobTitles.map((title) => (
                            <SelectItem key={title} value={title}>
                              {t(title)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('password')}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <div className="text-sm text-red-500 mt-2">{t(error)}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
              ) : type === 'login' ? (
                t('sign_in')
              ) : (
                t('create_account')
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      {/* <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          {type === 'login' ? (
            <>
              {t('no_account')}{' '}
              <Link 
                href="/register" 
                className="text-primary hover:text-primary/90 underline underline-offset-4"
              >
                {t('create_one')}
              </Link>
            </>
          ) : (
            <>
              {t('already_have_account')}{' '}
              <Link 
                href="/login" 
                className="text-primary hover:text-primary/90 underline underline-offset-4"
              >
                {t('sign_in')}
              </Link>
            </>
          )}
        </div>
      </CardFooter> */}
    </Card>
  );
}
