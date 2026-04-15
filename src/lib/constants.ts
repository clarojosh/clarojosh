
export const GRADE_SUBJECTS: Record<string, string[]> = {
  'Kinder': ['Kindergarten Curriculum'],
  'Grade 1': ['Language', 'Reading and Literacy', 'Mathematics', 'Makabansa', 'Good Manners and Right Conduct (GMRC)'],
  'Grade 2': ['Filipino', 'English', 'Mathematics', 'Makabansa', 'Good Manners and Right Conduct (GMRC)'],
  'Grade 3': ['Filipino', 'English', 'Mathematics', 'Science', 'Makabansa', 'Good Manners and Right Conduct (GMRC)'],
  'Grade 4': ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'TLE', 'Good Manners and Right Conduct (GMRC)', 'MAPEH'],
  'Grade 5': ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'TLE', 'Good Manners and Right Conduct (GMRC)', 'MAPEH'],
  'Grade 6': ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'TLE', 'Good Manners and Right Conduct (GMRC)', 'MAPEH'],
};

export const getGradeFromClassName = (className: string): string => {
  if (className.includes('Kinder')) return 'Kinder';
  const match = className.match(/Grade (\d)/);
  return match ? `Grade ${match[1]}` : 'Unknown';
};

export const getKeyStage = (grade: string): string => {
  if (grade === 'Kinder' || ['Grade 1', 'Grade 2', 'Grade 3'].includes(grade)) return 'Key Stage 1';
  if (['Grade 4', 'Grade 5', 'Grade 6'].includes(grade)) return 'Key Stage 2';
  return 'Unknown';
};
