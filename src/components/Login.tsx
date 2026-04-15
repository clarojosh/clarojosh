import React from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogIn, UserPlus, Info } from 'lucide-react';
import { GRADE_SUBJECTS, getGradeFromClassName } from '../lib/constants';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function Login() {
  const [isLogin, setIsLogin] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [showWelcome, setShowWelcome] = React.useState(false);

  React.useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('hasShownWelcome');
    if (!hasShownWelcome) {
      setShowWelcome(true);
      sessionStorage.setItem('hasShownWelcome', 'true');
    }
  }, []);
  
  const [formData, setFormData] = React.useState({
    email: '',
    employeeNumber: '',
    name: '',
    position: '',
    assignedClassId: '',
    subjects: [] as string[]
  });

  const positions = [
    'Teacher 1', 'Teacher 2', 'Teacher 3', 'Teacher 4', 'Teacher 5', 'Teacher 6', 'Teacher 7',
    'Master Teacher 1', 'School Principal 1', 'Administrative Officer 2', 'Admin Aide'
  ];

  const adminPositions = ['Master Teacher 1', 'School Principal 1', 'Administrative Officer 2', 'Admin Aide'];

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login: Password is the employee number
        await signInWithEmailAndPassword(auth, formData.email, formData.employeeNumber);
        toast.success('Logged in successfully');
      } else {
        // Sign Up
        if (!formData.position || !formData.assignedClassId) {
          toast.error('Please complete all fields');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.employeeNumber);
        const user = userCredential.user;

        await updateProfile(user, { displayName: formData.name });

        const isAdminPosition = adminPositions.includes(formData.position);
        const isInitialAdmin = formData.email === 'clarojosh@gmail.com' || formData.email === 'tagbaces112974@gmail.com';
        const isAdmin = isInitialAdmin || isAdminPosition;

        const profile = {
          uid: user.uid,
          email: formData.email,
          name: formData.name,
          employeeNumber: formData.employeeNumber,
          position: formData.position,
          assignedClassId: formData.assignedClassId,
          subjects: formData.subjects,
          role: isAdmin ? 'admin' : 'teacher',
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', user.uid), profile);
        
        // Also update the class to assign this teacher
        await updateDoc(doc(db, 'classes', formData.assignedClassId), {
          teacherId: user.uid
        });

        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Invalid email or employee number');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already registered');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-primary/20">
            <img 
              src="/logo.png" 
              alt="TES Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=TES&backgroundColor=0ea5e9';
              }}
            />
          </div>
          <CardTitle className="text-2xl font-bold">Tagbac Elementary School (112973)</CardTitle>
          <p className="text-sm font-medium text-primary mt-1 italic">"Track Smart, Decide Better."</p>
          <CardDescription className="mt-2">
            {isLogin ? 'Sign in to your account' : 'Create your teacher account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="teacher@example.com"
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employeeNumber">Employee Number (Password)</Label>
              <Input 
                id="employeeNumber" 
                type="password"
                value={formData.employeeNumber} 
                onChange={e => setFormData({...formData, employeeNumber: e.target.value})} 
                placeholder="Enter your employee number"
                required 
              />
            </div>

            {!isLogin && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Juan Dela Cruz"
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position</Label>
                  <Select 
                    value={formData.position} 
                    onValueChange={v => setFormData({...formData, position: v})}
                  >
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Select your position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="class">Grade Level & Section</Label>
                  <Select 
                    value={formData.assignedClassId} 
                    onValueChange={v => setFormData({...formData, assignedClassId: v, subjects: []})}
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select your class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.assignedClassId && (
                  <div className="grid gap-2">
                    <Label>Assigned Subject(s)</Label>
                    <div className="grid grid-cols-1 gap-2 border rounded-md p-3 bg-white max-h-40 overflow-y-auto">
                      {(() => {
                        const cls = classes.find(c => c.id === formData.assignedClassId);
                        const grade = cls ? getGradeFromClassName(cls.name) : '';
                        const subjects = GRADE_SUBJECTS[grade] || [];
                        return subjects.map(s => (
                          <div key={s} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`subject-${s}`} 
                              checked={formData.subjects.includes(s)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({...formData, subjects: [...formData.subjects, s]});
                                } else {
                                  setFormData({...formData, subjects: formData.subjects.filter(sub => sub !== s)});
                                }
                              }}
                            />
                            <label 
                              htmlFor={`subject-${s}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {s}
                            </label>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : isLogin ? (
                <><LogIn className="mr-2 h-4 w-4" /> Sign In</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> Register</>
              )}
            </Button>

            <div className="text-center">
              <Button 
                type="button" 
                variant="link" 
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs"
              >
                {isLogin ? "Don't have an account? Register here" : "Already have an account? Sign in"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="text-[10px] text-center text-muted-foreground mt-4 max-w-xs">
        Authorized personnel only. Your employee number serves as your default password.
      </p>

      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Info className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold text-primary">
              Welcome to Project SMART-Simplified Monitoring and Automated Reporting Tracker
            </DialogTitle>
            <DialogDescription className="text-base mt-4 leading-relaxed">
              Your all-in-one solution for efficient and reliable school data management.
              <br /><br />
              Easily monitor student performance, automate reports, and make smarter, data-driven decisions—anytime, anywhere.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center mt-6">
            <Button onClick={() => setShowWelcome(false)} className="px-8">
              Get Started
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
