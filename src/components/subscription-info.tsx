"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CreditCard, MessageSquare, Clock, Crown, AlertTriangle } from 'lucide-react';

interface SubscriptionInfoProps {
  subscription?: {
    type?: string;
    status?: string;
    messageLimit?: number;
    remainingMessages?: number;
    callSeconds?: number;
    endDate?: string | Date;
    payment?: {
      amount?: number;
      method?: string;
      lastPaymentDate?: string | Date;
      nextPaymentDate?: string | Date;
    };
  } | null;
}

export function SubscriptionInfo({ subscription }: SubscriptionInfoProps) {
  if (!subscription) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Subscription
          </CardTitle>
          <CardDescription>
            You&apos;re currently on the free plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock unlimited messages and premium features
              </p>
              <Button className="w-full" onClick={() => alert('Upgrade flow coming soon')}>
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const end = subscription.endDate ? new Date(subscription.endDate) : undefined;
  const remaining = subscription.remainingMessages ?? 0;
  const limit = subscription.messageLimit ?? 0;
  const usagePercentage = limit > 0 ? (remaining / limit) * 100 : 0;
  const isLowUsage = remaining <= 10 && remaining > 0;
  const isExpired = remaining === 0;

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanName = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'monthly': return 'Monthly Plan';
      case 'quarterly': return 'Quarterly Plan';
      case 'yearly': return 'Yearly Plan';
      case 'trial': return 'Free Trial';
      default: return 'Unknown Plan';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-blue-600" />
            Subscription
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {subscription.status || 'Unknown'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {getPlanName(subscription.type)} - Manage your subscription and usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Message Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {remaining} / {limit} messages
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          
          {isLowUsage && !isExpired && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                You&apos;re running low on messages. Consider upgrading your plan.
              </span>
            </div>
          )}
          
          {isExpired && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">
                Your message limit has been reached. Upgrade to continue chatting.
              </span>
            </div>
          )}
        </div>

        {/* Call Seconds */}
        {subscription.callSeconds && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Call Minutes</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.floor(subscription.callSeconds / 60)} minutes
            </span>
          </div>
        )}

        {/* Payment Info */}
        {subscription.payment && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-md">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Payment Information</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <span className="ml-2 font-medium">${subscription.payment.amount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Method:</span>
                <span className="ml-2 font-medium">{subscription.payment.method}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expiry Date */}
        {end && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Next Billing Date</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {end.toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => alert('Change plan flow coming soon')}
          >
            Change Plan
          </Button>
          <Button 
            className="flex-1"
            onClick={() => alert('Upgrade flow coming soon')}
          >
            <Crown className="mr-2 h-4 w-4" />
            Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


