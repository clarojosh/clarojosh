import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Edit2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface TeacherListProps {
  userProfile: any;
}

export default function TeacherList({ userProfile }: TeacherListProps) {
  const [teachers, setTeachers] = React.useState<any[]>([]);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<any>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    employeeNumber: '',
    assignedClassId: ''
  });

  const isAdmin = userProfile?.role === 'admin';

  React.useEffect(() => {
    // Admins should see all users (teachers and other admins) in the directory
    const userQuery = isAdmin ? collection(db, 'users') : query(collection(db, 'users'), where('role', '==', 'teacher'));
    
    const unsubTeachers = onSnapshot(userQuery, (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTeachers();
      unsubClasses();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        await updateDoc(doc(db, 'users', editingTeacher.id), formData);
        toast.success('Teacher updated successfully');
      }
      setIsAddDialogOpen(false);
      setEditingTeacher(null);
      setFormData({ name: '', email: '', employeeNumber: '', assignedClassId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher account?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('Teacher account deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
    }
  };

  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.name : 'Not Assigned';
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-2xl font-bold">Teacher Directory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers by name, email or ID..."
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
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Employee Number</TableHead>
                <TableHead>Assigned Class</TableHead>
                <TableHead>Email</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No staff found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {teacher.name}
                      {teacher.role === 'admin' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase font-bold">Admin</span>}
                    </TableCell>
                    <TableCell>{teacher.position || 'N/A'}</TableCell>
                    <TableCell>{teacher.employeeNumber || 'N/A'}</TableCell>
                    <TableCell>{getClassName(teacher.assignedClassId)}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(teacher.id)}>
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
