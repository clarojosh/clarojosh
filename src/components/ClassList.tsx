import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Edit2, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getGradeFromClassName, getKeyStage } from '../lib/constants';

interface ClassListProps {
  userProfile: any;
}

export default function ClassList({ userProfile }: ClassListProps) {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [teachers, setTeachers] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    subject: '',
    teacherId: '',
    room: ''
  });

  const classOptions = [
    "Kinder (Lily)", "Kinder (Lotus)", 
    "Grade 1 (Camia)", "Grade 1 (Rose)", 
    "Grade 2 (Daisy)", "Grade 2 (Dahlia)", 
    "Grade 3 (Zinnia)", "Grade 3 (Vinca)", 
    "Grade 4 (Molave)", "Grade 4 (Narra)", 
    "Grade 5 (Yakal)", "Grade 5 (Molave)", 
    "Grade 6 (Acacia)", "Grade 6 (Talisay)"
  ];

  const seedClasses = async () => {
    if (!window.confirm('This will automatically create all 14 Tagbac Elementary School (112973) classes. Continue?')) return;
    
    try {
      const batchPromises = classOptions.map(className => {
        const grade = getGradeFromClassName(className);
        return addDoc(collection(db, 'classes'), {
          name: className,
          grade: grade,
          keyStage: getKeyStage(grade),
          subject: 'General Education',
          teacherId: '',
          room: 'Main Building'
        });
      });
      
      await Promise.all(batchPromises);
      toast.success('All 14 classes have been created successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    }
  };

  const isAdmin = userProfile?.role === 'admin';

  React.useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'classes');
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error('ClassList Teachers Error:', error));

    return () => {
      unsubClasses();
      unsubTeachers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grade = getGradeFromClassName(formData.name);
      const dataWithMetadata = {
        ...formData,
        grade: grade,
        keyStage: getKeyStage(grade)
      };
      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), dataWithMetadata);
        toast.success('Class updated successfully');
      } else {
        await addDoc(collection(db, 'classes'), dataWithMetadata);
        toast.success('Class added successfully');
      }
      setIsAddDialogOpen(false);
      setEditingClass(null);
      setFormData({ name: '', subject: '', teacherId: '', room: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await deleteDoc(doc(db, 'classes', id));
      toast.success('Class deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
    }
  };

  const getTeacherName = (id: string) => {
    return teachers.find(t => t.id === id)?.name || 'Unknown Teacher';
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-2xl font-bold">Class Directory</CardTitle>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={seedClasses} className="border-primary text-primary hover:bg-primary/10">
              Seed All Classes
            </Button>
          )}
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={
              <Button onClick={() => { setEditingClass(null); setFormData({ name: '', subject: '', teacherId: '', room: '' }); }}>
                <Plus className="mr-2 h-4 w-4" /> Create Class
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="c-name">Class Name (Grade & Section)</Label>
                  <Select value={formData.name} onValueChange={v => setFormData({...formData, name: v})}>
                    <SelectTrigger id="c-name">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-subject">Subject</Label>
                  <Input id="c-subject" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-teacher">Teacher</Label>
                  <Select value={formData.teacherId} onValueChange={v => setFormData({...formData, teacherId: v})}>
                    <SelectTrigger id="c-teacher">
                      <SelectValue placeholder="Assign a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.subject})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-room">Room</Label>
                  <Input id="c-room" placeholder="e.g. Lab 2" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">{editingClass ? 'Update Class' : 'Create Class'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes by name or subject..."
              className="pl-8"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Room</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No classes found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.subject}</TableCell>
                    <TableCell>{getTeacherName(cls.teacherId)}</TableCell>
                    <TableCell>{cls.room || 'N/A'}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingClass(cls); setFormData(cls); setIsAddDialogOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cls.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
