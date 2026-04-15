import React from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { Brain, TrendingUp, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Markdown from 'react-markdown';
import { GRADE_SUBJECTS, getGradeFromClassName, getKeyStage } from '../lib/constants';

interface AdminAnalyticsProps {
  userProfile: any;
}

export default function AdminAnalytics({ userProfile }: AdminAnalyticsProps) {
  const [reportData, setReportData] = React.useState<any[]>([]);
  const [gradeData, setGradeData] = React.useState<any[]>([]);
  const [allReports, setAllReports] = React.useState<any[]>([]);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [interpretation, setInterpretation] = React.useState<string | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [isInterpretationExpanded, setIsInterpretationExpanded] = React.useState(true);

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  React.useEffect(() => {
    // Fetch Classes for mapping
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error('AdminAnalytics Classes Error:', error));

    // Fetch CRLA reports
    const unsubCRLA = onSnapshot(collection(db, 'reports_crla'), (snapshot) => {
      const counts: any = {};
      const reports = snapshot.docs.map(doc => ({ type: 'CRLA', ...doc.data() }));
      snapshot.docs.forEach(doc => {
        const period = doc.data().period;
        counts[period] = (counts[period] || 0) + 1;
      });
      setReportData(Object.entries(counts).map(([name, value]) => ({ name, value })));
      setAllReports(prev => [...prev.filter(r => r.type !== 'CRLA'), ...reports]);
    }, (error) => console.error('AdminAnalytics CRLA Error:', error));

    // Fetch Grade reports
    const unsubGrades = onSnapshot(collection(db, 'reports_grades'), (snapshot) => {
      const counts: any = {};
      const reports = snapshot.docs.map(doc => ({ type: 'Grades', ...doc.data() }));
      snapshot.docs.forEach(doc => {
        const period = doc.data().period;
        counts[period] = (counts[period] || 0) + 1;
      });
      setGradeData(Object.entries(counts).map(([name, value]) => ({ name, value })));
      setAllReports(prev => [...prev.filter(r => r.type !== 'Grades'), ...reports]);
    }, (error) => console.error('AdminAnalytics Grades Error:', error));

    // Fetch other reports for AI context
    const unsubSkills = onSnapshot(collection(db, 'reports_skills'), (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ type: 'Skills', ...doc.data() }));
      setAllReports(prev => [...prev.filter(r => r.type !== 'Skills'), ...reports]);
    }, (error) => console.error('AdminAnalytics Skills Error:', error));

    return () => {
      unsubClasses();
      unsubCRLA();
      unsubGrades();
      unsubSkills();
    };
  }, []);

  const generateInterpretation = async () => {
    setLoadingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare data for AI
      const classMap = classes.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
      
      const reportsWithContext = allReports.map(r => {
        const cls = classMap[r.classId];
        const grade = cls ? getGradeFromClassName(cls.name) : 'Unknown';
        const keyStage = getKeyStage(grade);
        
        return {
          type: r.type,
          period: r.period,
          className: cls?.name,
          grade: grade,
          keyStage,
          content: r.content
        };
      });

      const prompt = `
        As an educational data analyst for Tagbac Elementary School (112973), interpret the following learner performance data. 
        Provide a structured analysis broken down by:
        1. Individual Classes (highlighting notable performers or struggles)
        2. Grade Levels (trends across sections)
        3. Key Stage 1 (Grades 1-3)
        4. Key Stage 2 (Grades 4-6)

        Data: ${JSON.stringify(reportsWithContext.slice(0, 50))} 

        Focus on academic performance, literacy (CRLA), and mastered/least mastered skills. 
        Be professional, insightful, and provide specific recommendations for each level.
        Format the response with clear headings.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setInterpretation(response.text || "Unable to generate interpretation at this time.");
    } catch (error) {
      console.error("AI Error:", error);
      setInterpretation("Error generating interpretation. Please ensure Gemini API key is configured.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Data Analytics & Insights
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateInterpretation} 
          disabled={loadingAI}
          className="gap-2"
        >
          {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          AI Interpretation
        </Button>
      </div>

      {interpretation && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI-Powered Performance Analysis
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsInterpretationExpanded(!isInterpretationExpanded)}
            >
              {isInterpretationExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CardHeader>
          {isInterpretationExpanded && (
            <CardContent>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                <Markdown>{interpretation}</Markdown>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CRLA Submissions by Period</CardTitle>
            <CardDescription>Beginning, Middle, and End of Year tracking</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grade Report Distribution</CardTitle>
            <CardDescription>Reports submitted per academic term</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
