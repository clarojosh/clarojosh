import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, serverTimestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, FileText, Trash2, Download, Filter, ShieldAlert, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { GRADE_SUBJECTS, getGradeFromClassName, getKeyStage } from '../lib/constants';

interface ReportsManagerProps {
  userProfile: any;
  category: 'assessments' | 'grades';
}

export default function ReportsManager({ userProfile, category }: ReportsManagerProps) {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<string>('');
  const [reports, setReports] = React.useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [activeSubTab, setActiveSubTab] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

  const [formData, setFormData] = React.useState<any>({
    period: '',
    subject: '',
    content: '',
    excelData: null
  });

  React.useEffect(() => {
    if (category === 'grades' || activeSubTab === 'skills') {
      setFormData(prev => ({ ...prev, period: 'First Term' }));
    } else {
      setFormData(prev => ({ ...prev, period: 'BOSY' }));
    }
  }, [category, activeSubTab]);

  const isAdmin = userProfile?.role === 'admin';

  React.useEffect(() => {
    if (!userProfile) return;

    let classQuery: any = collection(db, 'classes');

    if (!isAdmin) {
      // Teachers have restricted access. We must query specifically to avoid permission errors.
      // Firestore rules are not filters, so the query must match the allowed subset.
      const assignedId = userProfile.assignedClassId;
      if (!assignedId) {
        setClasses([]);
        return;
      }

      // We'll fetch the assigned class first to determine the grade level
      getDoc(doc(db, 'classes', assignedId)).then(classDoc => {
        if (!classDoc.exists()) {
          setClasses([]);
          return;
        }
        const assignedClassData = classDoc.data();
        const grade = assignedClassData.grade;

        let q;
        if (['Kinder', 'Grade 1', 'Grade 2', 'Grade 3'].includes(grade)) {
          // Grades 1–3: Only assigned class
          q = query(collection(db, 'classes'), where('__name__', '==', assignedId));
        } else if (grade === 'Grade 4') {
          // Grade 4: All Grade 4
          q = query(collection(db, 'classes'), where('grade', '==', 'Grade 4'));
        } else if (['Grade 5', 'Grade 6'].includes(grade)) {
          // Grade 5-6: All Grade 5 and 6
          q = query(collection(db, 'classes'), where('grade', 'in', ['Grade 5', 'Grade 6']));
        } else {
          q = query(collection(db, 'classes'), where('__name__', '==', assignedId));
        }

        const unsub = onSnapshot(q, (snapshot) => {
          setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        }, (error) => {
          console.error('ReportsManager Classes Error:', error);
          handleFirestoreError(error, OperationType.GET, 'classes');
        });
        return unsub;
      }).catch(error => {
        console.error('Error fetching assigned class:', error);
      });
      return;
    }

    // Admins see everything
    const unsubClasses = onSnapshot(classQuery, (snapshot: any) => {
      const allClassData = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
      setClasses(allClassData);
      if (allClassData.length > 0 && !selectedClass) {
        setSelectedClass(allClassData[0].id);
      }
    }, (error: any) => {
      console.error('ReportsManager Classes Error:', error);
      handleFirestoreError(error, OperationType.GET, 'classes');
    });
    return () => unsubClasses();
  }, [userProfile, isAdmin]);

  React.useEffect(() => {
    if (!selectedClass || !activeSubTab) return;

    let collectionName = '';
    if (category === 'assessments') {
      if (activeSubTab === 'crla') collectionName = 'reports_crla';
      if (activeSubTab === 'philiri') collectionName = 'reports_philiri';
      if (activeSubTab === 'rma') collectionName = 'reports_rma';
      if (activeSubTab === 'elak') collectionName = 'reports_elak';
      if (activeSubTab === 'skills') collectionName = 'reports_skills';
    } else if (category === 'grades') {
      collectionName = 'reports_grades';
    }
    
    if (!collectionName) return;

    const q = query(collection(db, collectionName), where('classId', '==', selectedClass));
    const unsub = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    });

    return () => unsub();
  }, [selectedClass, activeSubTab, category]);

  React.useEffect(() => {
    if (category === 'assessments') setActiveSubTab('crla');
    if (category === 'grades') setActiveSubTab('termly');
  }, [category]);

  React.useEffect(() => {
    if (category !== 'assessments' || !selectedClass) return;
    
    const grade = getSelectedClassGrade();
    const isKinder = grade === 'Kinder';
    const gradeNum = typeof grade === 'number' ? grade : null;
    
    const showELAK = isKinder;
    const showCRLA = !isKinder && (grade === null || (gradeNum !== null && gradeNum < 4));
    const showPhilIRI = !isKinder && (grade === null || gradeNum !== 1);

    if (isKinder && activeSubTab !== 'elak') {
      setActiveSubTab('elak');
    } else if (!isKinder && activeSubTab === 'elak') {
      setActiveSubTab('crla');
    } else if (activeSubTab === 'crla' && !showCRLA) {
      setActiveSubTab('philiri');
    } else if (activeSubTab === 'philiri' && !showPhilIRI) {
      setActiveSubTab('crla');
    }
  }, [selectedClass, category]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setFormData({ ...formData, excelData: data, content: `Excel Upload: ${file.name}` });
      toast.success('Excel file parsed successfully');
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    let collectionName = '';
    const grade = getSelectedClassGrade();
    const data: any = {
      teacherId: userProfile.uid,
      classId: selectedClass,
      grade: grade,
      keyStage: grade ? getKeyStage(grade) : 'Unknown',
      submittedAt: new Date().toISOString(),
      ...formData
    };

    if (category === 'assessments') {
      if (activeSubTab === 'crla') collectionName = 'reports_crla';
      if (activeSubTab === 'philiri') collectionName = 'reports_philiri';
      if (activeSubTab === 'rma') collectionName = 'reports_rma';
      if (activeSubTab === 'elak') collectionName = 'reports_elak';
      if (activeSubTab === 'skills') collectionName = 'reports_skills';
    } else if (category === 'grades') {
      collectionName = 'reports_grades';
    }

    try {
      await addDoc(collection(db, collectionName), data);
      
      // Simulate Google Drive Upload
      console.log('Automatically storing data to Google Drive for class:', selectedClass);
      // In a real implementation, we would call a backend API or use the Drive API directly
      // toast.info('Data automatically synced to Google Drive');

      toast.success('Report submitted successfully');
      setIsAddDialogOpen(false);
      const defaultPeriod = (category === 'grades' || activeSubTab === 'skills') ? 'First Term' : 'BOSY';
      setFormData({ period: defaultPeriod, content: '', excelData: null });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    let collectionName = '';
    if (category === 'assessments') {
      if (activeSubTab === 'crla') collectionName = 'reports_crla';
      if (activeSubTab === 'philiri') collectionName = 'reports_philiri';
      if (activeSubTab === 'rma') collectionName = 'reports_rma';
      if (activeSubTab === 'elak') collectionName = 'reports_elak';
      if (activeSubTab === 'skills') collectionName = 'reports_skills';
    } else if (category === 'grades') {
      collectionName = 'reports_grades';
    }

    try {
      await deleteDoc(doc(db, collectionName, id));
      toast.success('Report deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const getSelectedClassGrade = () => {
    const cls = classes.find(c => c.id === selectedClass);
    return cls ? getGradeFromClassName(cls.name) : null;
  };

  const getAvailableSubjects = () => {
    const grade = getSelectedClassGrade();
    return grade ? GRADE_SUBJECTS[grade] || [] : [];
  };

  React.useEffect(() => {
    const subjects = getAvailableSubjects();
    if (subjects.length > 0 && !formData.subject) {
      setFormData(prev => ({ ...prev, subject: subjects[0] }));
    }
  }, [selectedClass, classes]);

  const renderAssessmentTabs = () => {
    const grade = getSelectedClassGrade();
    const isKinder = grade === 'Kinder';
    const gradeNumMatch = grade?.match(/Grade (\d)/);
    const gradeNum = gradeNumMatch ? parseInt(gradeNumMatch[1]) : null;
    
    const showELAK = isKinder;
    const showCRLA = !isKinder && (grade === null || (gradeNum !== null && gradeNum < 4));
    const showPhilIRI = !isKinder && (grade === null || gradeNum !== 1);
    const showRMA = !isKinder;
    const showSkills = !isKinder;

    // Calculate grid columns based on visible tabs
    const visibleCount = [showELAK, showCRLA, showPhilIRI, showRMA, showSkills].filter(Boolean).length;

    return (
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${visibleCount}, 1fr)` }}>
          {showELAK && <TabsTrigger value="elak">ELAK (Literacy)</TabsTrigger>}
          {showCRLA && <TabsTrigger value="crla">CRLA (Literacy)</TabsTrigger>}
          {showPhilIRI && <TabsTrigger value="philiri">Phil-IRI</TabsTrigger>}
          {showRMA && <TabsTrigger value="rma">RMA (Math)</TabsTrigger>}
          {showSkills && <TabsTrigger value="skills">Skills (Mastered/Least)</TabsTrigger>}
        </TabsList>
      </Tabs>
    );
  };

  const isKinder = getSelectedClassGrade() === 'Kinder';

  if (isKinder && category === 'grades') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold capitalize">{category} Reports</h2>
            <p className="text-muted-foreground">Manage and track teacher submissions for Tagbac Elementary School (112973).</p>
          </div>
          <div className="flex-1 md:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.subject})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Not Applicable</h3>
            <p className="text-muted-foreground max-w-md mt-2">
            Term Grades are not required for Kindergarten classes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold capitalize">{category} Reports</h2>
          <p className="text-muted-foreground">Manage and track teacher submissions for Tagbac Elementary School (112973).</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.subject})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={<Button className="shrink-0" />}>
              <Plus className="w-4 h-4 mr-2" /> Submit Report
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Submit New {activeSubTab.toUpperCase()} Report</DialogTitle>
                <CardDescription>Enter the details for the report submission.</CardDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <Select value={formData.subject} onValueChange={v => setFormData({...formData, subject: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSubjects().map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{(category === 'grades' || activeSubTab === 'skills') ? 'Term' : 'Assessment Period'}</Label>
                  <Select value={formData.period} onValueChange={v => setFormData({...formData, period: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(category === 'grades' || activeSubTab === 'skills') ? (
                        <>
                          <SelectItem value="First Term">First Term</SelectItem>
                          <SelectItem value="Second Term">Second Term</SelectItem>
                          <SelectItem value="Third Term">Third Term</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="BOSY">BOSY (Beginning of School Year)</SelectItem>
                          <SelectItem value="MOSY">MOSY (Middle of School Year)</SelectItem>
                          {activeSubTab !== 'philiri' && <SelectItem value="EOSY">EOSY (End of School Year)</SelectItem>}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Excel File Upload (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    {formData.excelData && <FileSpreadsheet className="w-5 h-5 text-green-600" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Upload your class record or assessment sheet.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Report Content / Remarks</Label>
                  <Input 
                    placeholder="Enter summary or link to document" 
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isUploading}>
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      'Submit Report'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {category === 'assessments' && renderAssessmentTabs()}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Submitted {activeSubTab.toUpperCase()} Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{(category === 'grades' || activeSubTab === 'skills') ? 'Term' : 'Period'}</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Content/Remarks</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      No reports found for this class and category.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.period}
                      </TableCell>
                      <TableCell>
                        {report.subject || 'N/A'}
                      </TableCell>
                      <TableCell>{report.content || 'No remarks provided'}</TableCell>
                      <TableCell>{new Date(report.submittedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" title="Download/View">
                            <Download className="h-4 w-4" />
                          </Button>
                          {(isAdmin || report.teacherId === userProfile.uid) && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(report.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
