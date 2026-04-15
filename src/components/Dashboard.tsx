import React from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, CheckCircle2, BarChart3, HardDrive, ExternalLink } from 'lucide-react';
import AdminAnalytics from './AdminAnalytics';

interface DashboardProps {
  userProfile: any;
}

export default function Dashboard({ userProfile }: DashboardProps) {
  const [stats, setStats] = React.useState({
    teachers: 0,
    classes: 0,
    assessments: 0,
    grades: 0
  });

  React.useEffect(() => {
    if (!userProfile) return;

    const isAdmin = userProfile.role === 'admin';

    // Only admins can see total counts across all classes/teachers
    if (!isAdmin) return;

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      setStats(prev => ({ ...prev, teachers: snapshot.size }));
    }, (error) => console.error('Dashboard Teachers Error:', error));

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setStats(prev => ({ ...prev, classes: snapshot.size }));
    }, (error) => console.error('Dashboard Classes Error:', error));

    const unsubCRLA = onSnapshot(collection(db, 'reports_crla'), (snapshot) => {
      setStats(prev => ({ ...prev, assessments: prev.assessments + snapshot.size }));
    }, (error) => console.error('Dashboard CRLA Error:', error));
    
    const unsubRMA = onSnapshot(collection(db, 'reports_rma'), (snapshot) => {
      setStats(prev => ({ ...prev, assessments: prev.assessments + snapshot.size }));
    }, (error) => console.error('Dashboard RMA Error:', error));

    const unsubGrades = onSnapshot(collection(db, 'reports_grades'), (snapshot) => {
      setStats(prev => ({ ...prev, grades: snapshot.size }));
    }, (error) => console.error('Dashboard Grades Error:', error));

    return () => {
      unsubTeachers();
      unsubClasses();
      unsubCRLA();
      unsubRMA();
      unsubGrades();
    };
  }, [userProfile]);

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-lg shadow-sm border">
            <img 
              src="/logo.png" 
              alt="TES Logo" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=TES&backgroundColor=0ea5e9';
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-col">
              <h2 className="text-3xl font-bold tracking-tight">Tagbac Elementary School (112973)</h2>
              <p className="text-sm font-medium text-muted-foreground">Ragay 1 District, Schools Division Office of Camarines Sur</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Welcome back, {userProfile?.name}. Here's the latest report summary.</p>
          </div>
        </div>
        
        {userProfile?.email === 'clarojosh@gmail.com' && (
          <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
            <HardDrive className="w-4 h-4 text-primary" />
            Sync to clarojosh@gmail.com
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teachers}</div>
            <p className="text-xs text-muted-foreground">Across all Key Stages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classes}</div>
            <p className="text-xs text-muted-foreground">Ongoing this Term</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessment Reports</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assessments}</div>
            <p className="text-xs text-muted-foreground">CRLA, Phil-IRI, RMA</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grade Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.grades}</div>
            <p className="text-xs text-muted-foreground">Submitted this term</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{i === 1 ? 'Assessment Report Filed' : i === 2 ? 'Grade Entry Updated' : 'Teacher Profile Setup'}</p>
                    <p className="text-xs text-muted-foreground">
                      {i === 1 ? 'CRLA report for Grade 2 - Daisy has been recorded.' : 
                       i === 2 ? 'Term 1 grades for Grade 5 - Yakal have been published.' : 
                       'A new teacher has completed their profile setup.'}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">{i * 2}h ago</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start">Submit CRLA Report</Button>
            <Button variant="outline" className="justify-start">Submit Phil-IRI Report</Button>
            <Button variant="outline" className="justify-start">Submit Skills Report</Button>
            {isAdmin && (
              <Button variant="default" className="justify-start mt-2">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open School Drive
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && <AdminAnalytics userProfile={userProfile} />}
    </div>
  );
}
