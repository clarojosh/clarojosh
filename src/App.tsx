import React, { Component } from 'react';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { LogOut, GraduationCap, BookOpen, CheckSquare, BarChart3, ShieldAlert } from 'lucide-react';
import TeacherList from './components/TeacherList';
import ClassList from './components/ClassList';
import ReportsManager from './components/ReportsManager';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

// Error Boundary Component
class ErrorBoundary extends Component<any, any> {
  state = { hasError: false, errorInfo: null };
  props: any;

  constructor(props: any) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-red-50">
          <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
          <h1 className="text-2xl font-bold text-red-900 mb-2">Something went wrong</h1>
          <p className="text-red-700 mb-4 text-center max-w-md">
            {this.state.errorInfo?.startsWith('{') ? "A database permission error occurred." : this.state.errorInfo}
          </p>
          <Button onClick={() => window.location.reload()}>Reload Application</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            // Wait for ProfileSetup component to handle creation
            setUserProfile(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <CardTitle>Loading Profile...</CardTitle>
          <p className="text-muted-foreground mt-2">Please wait while we fetch your account details.</p>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="TES Logo" 
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=TES&backgroundColor=0ea5e9';
                }}
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold leading-none">Tagbac Elementary School (112973)</span>
                <span className="text-[10px] text-muted-foreground">Ragay 1 District, SDO Camarines Sur</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{userProfile?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{userProfile?.role}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto p-4 md:p-6">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex w-auto">
                <TabsTrigger value="dashboard" className="gap-2">
                  <BarChart3 className="w-4 h-4" /> Dashboard
                </TabsTrigger>
                {userProfile?.role === 'admin' && (
                  <>
                    <TabsTrigger value="teachers" className="gap-2">
                      <GraduationCap className="w-4 h-4" /> Teachers
                    </TabsTrigger>
                    <TabsTrigger value="classes" className="gap-2">
                      <BookOpen className="w-4 h-4" /> Classes
                    </TabsTrigger>
                  </>
                )}
                <TabsTrigger value="assessments" className="gap-2">
                  <CheckSquare className="w-4 h-4" /> Assessments
                </TabsTrigger>
                <TabsTrigger value="grades" className="gap-2">
                  <BarChart3 className="w-4 h-4" /> Grade Reports
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard">
              <Dashboard userProfile={userProfile} />
            </TabsContent>
            <TabsContent value="teachers">
              <TeacherList userProfile={userProfile} />
            </TabsContent>
            <TabsContent value="classes">
              <ClassList userProfile={userProfile} />
            </TabsContent>
            <TabsContent value="assessments">
              <ReportsManager userProfile={userProfile} category="assessments" />
            </TabsContent>
            <TabsContent value="grades">
              <ReportsManager userProfile={userProfile} category="grades" />
            </TabsContent>
          </Tabs>
        </main>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}
