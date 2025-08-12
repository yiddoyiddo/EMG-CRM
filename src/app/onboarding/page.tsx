'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, User, Shield, Key, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to EMG CRM',
      description: 'Learn about your role and access',
      completed: false,
    },
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Set up your name and preferences',
      completed: false,
    },
    {
      id: 'security',
      title: 'Set Up Security',
      description: 'Change your password for security',
      completed: false,
    },
    {
      id: 'finish',
      title: 'Ready to Start',
      description: 'Your account is configured',
      completed: false,
    },
  ]);

  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        name: session.user.name || '',
      }));
    }
  }, [session]);

  // Redirect if already completed onboarding (user has a name set)
  useEffect(() => {
    if (status !== 'loading' && session?.user?.name && session.user.name.trim().length > 0) {
      router.push('/');
    }
  }, [session, status, router]);

  const markStepCompleted = (stepIndex: number) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, completed: true } : step
    ));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      markStepCompleted(currentStep);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleProfileUpdate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      nextStep();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handlePasswordUpdate = async () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Please enter and confirm your new password');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.newPassword }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update password');
      }

      toast.success('Password updated successfully');
      nextStep();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const finishOnboarding = () => {
    markStepCompleted(currentStep);
    toast.success('Welcome to EMG CRM! Your account is ready to use.');
    router.push('/');
  };

  // Handle loading and authentication states
  if (status === 'loading') {
    return <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>;
  }

  if (status === 'unauthenticated' || !session) {
    if (typeof window !== 'undefined') {
      router.push('/auth/login');
    }
    return null;
  }

  const isAdmin = session.user?.role === 'ADMIN';
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to EMG CRM</h1>
          <p className="text-muted-foreground">Let's set up your account to get started</p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Setup Progress</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} />
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 p-2 rounded text-xs ${
                    index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.completed
                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-current" />
                  )}
                  <span className="font-medium">{step.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="min-h-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 0 && <Shield className="h-5 w-5" />}
              {currentStep === 1 && <User className="h-5 w-5" />}
              {currentStep === 2 && <Key className="h-5 w-5" />}
              {currentStep === 3 && <CheckCircle className="h-5 w-5" />}
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Welcome Step */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium">Hello, {session.user.email}</h3>
                  <Badge variant={isAdmin ? "default" : "secondary"} className="gap-1">
                    {isAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {session.user.role}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <p>Welcome to the EMG CRM system! You've been granted <strong>{session.user.role}</strong> access.</p>
                  
                  {isAdmin ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Admin Access</h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• Full access to all leads, pipeline, and financial data</li>
                        <li>• User management and system administration</li>
                        <li>• Advanced reporting and analytics</li>
                        <li>• System configuration and settings</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">BDR Access</h4>
                      <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                        <li>• Access to your assigned leads and pipeline items</li>
                        <li>• Track your activities and performance</li>
                        <li>• Manage your calls, agreements, and partner lists</li>
                        <li>• View your individual reporting dashboard</li>
                      </ul>
                    </div>
                  )}
                </div>
                
                <Button onClick={nextStep} className="w-full">
                  Get Started <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Profile Step */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <p>Let's set up your profile information to personalize your experience.</p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <Label>Email Address</Label>
                    <Input value={session.user.email || ''} disabled />
                    <p className="text-xs text-muted-foreground mt-1">Your email cannot be changed during onboarding.</p>
                  </div>
                  
                  <div>
                    <Label>Role</Label>
                    <div className="mt-1">
                      <Badge variant={isAdmin ? "default" : "secondary"} className="gap-1">
                        {isAdmin ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {session.user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleProfileUpdate} className="w-full">
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Security Step */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <p>For security, please set a new password that you'll remember.</p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        placeholder="Enter new password (min 6 characters)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm your new password"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Password requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>At least 6 characters long</li>
                      <li>Should be unique and memorable to you</li>
                    </ul>
                  </div>
                </div>
                
                <Button onClick={handlePasswordUpdate} className="w-full">
                  Set Password <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Finish Step */}
            {currentStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold">You're All Set!</h3>
                  <p className="text-muted-foreground mt-2">Your EMG CRM account is ready to use.</p>
                </div>
                
                <div className="bg-muted rounded-lg p-4 text-left space-y-2">
                  <h4 className="font-medium">Next Steps:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Explore your dashboard and available tools</li>
                    <li>• {isAdmin ? 'Start managing users and system settings' : 'Begin working with your assigned leads and pipeline'}</li>
                    <li>• Check out the reporting section for insights</li>
                    <li>• Visit your profile anytime to update your information</li>
                  </ul>
                </div>
                
                <Button onClick={finishOnboarding} size="lg" className="w-full">
                  Enter EMG CRM <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}