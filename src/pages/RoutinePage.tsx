import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useRoutines } from '../hooks/useRoutines';
import { useCourses } from '../hooks/useCourses';
import { useTeachers } from '../hooks/useTeachers';
import { useAuth } from '../hooks/useAuth';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { format, addDays, startOfWeek } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Search, 
  ChevronLeft,
  ChevronRight,
  Users,
  BookOpen,
  GraduationCap,
  Building,
  User,
  Info,
  Code,
  ExternalLink,
  Plus,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Teacher } from '../types/teacher';
import { getInitials } from '../utils/stringUtils';
import React from 'react';

// Lazy load TeacherDetailsModal to improve initial load time
const TeacherDetailsModal = lazy(() => import('./TeacherDetailsModal').then(module => ({ default: module.TeacherDetailsModal })));

// Create a memoized TeacherDetailsModal component to prevent unnecessary re-renders
const MemoizedTeacherDetailsModal = React.memo(TeacherDetailsModal);

export function RoutinePage() {
  const { routines, loading, error, prefetchRoutineData } = useRoutines();
  const { courses } = useCourses();
  const { teachers } = useTeachers();
  const { user } = useAuth();
  const isOffline = useOfflineStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [enrichedSlots, setEnrichedSlots] = useState<any[]>([]);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('');

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  // Trigger prefetch when the component loads
  useEffect(() => {
    prefetchRoutineData();
  }, [prefetchRoutineData]);

  const currentRoutine = useMemo(() => {
    if (selectedRoutineId) {
      return routines.find(r => r.id === selectedRoutineId);
    }
    return routines.find(r => r.isActive) || routines[0];
  }, [routines, selectedRoutineId]);

  useEffect(() => {
    if (currentRoutine?.id && !selectedRoutineId) {
      setSelectedRoutineId(currentRoutine.id);
    }
  }, [currentRoutine, selectedRoutineId]);

  const handleRoutineChange = useCallback((routineId: string) => {
    if (routineId === 'create-new') {
      window.location.href = '/#admin?tab=routine';
    } else {
      setSelectedRoutineId(routineId);
    }
  }, []);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 6 });
    return Array.from({ length: 6 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        dayNum: format(date, 'd'),
        dayName: format(date, 'EEE'),
        isSelected: format(date, 'EEEE') === format(selectedDate, 'EEEE')
      };
    });
  }, [selectedDate]);

  // Optimize slot enrichment process
  useEffect(() => {
    if (!currentRoutine?.slots) {
      setEnrichedSlots([]);
      return;
    }

    // Create lookup maps for faster access
    const courseMap = new Map();
    const teacherMap = new Map();
    
    courses.forEach(course => courseMap.set(course.id, course));
    teachers.forEach(teacher => teacherMap.set(teacher.id, teacher));

    const enriched = currentRoutine.slots.map(slot => {
      // Use map lookup instead of array.find (O(1) vs O(n))
      const course = slot.courseId ? courseMap.get(slot.courseId) : undefined;
      const teacher = slot.teacherId ? teacherMap.get(slot.teacherId) : undefined;
      
      const courseName = slot.courseName || (course ? course.name : 'Unknown Course');
      const courseCode = course?.code || 'N/A';
      const teacherName = slot.teacherName || (teacher ? teacher.name : 'Unknown Teacher');
      
      return {
        ...slot,
        course,
        teacher,
        courseName,
        courseCode,
        teacherName
      };
    });

    setEnrichedSlots(enriched);
  }, [currentRoutine, courses, teachers]);

  const filteredSlots = useMemo(() => {
    return enrichedSlots.filter(slot => {
      const matchesSearch = searchTerm === '' || 
        slot.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDay = format(selectedDate, 'EEEE') === slot.dayOfWeek;
      
      return matchesSearch && matchesDay;
    });
  }, [enrichedSlots, searchTerm, selectedDate]);

  // Create a memoized handler for day selection
  const handleDaySelect = useCallback((day: Date) => {
    setSelectedDate(day);
  }, []);

  // Create a memoized handler for teacher selection
  const handleTeacherSelect = useCallback((teacher: Teacher) => {
    setSelectedTeacher(teacher);
  }, []);

  // Create a memoized handler for teacher modal close
  const handleCloseTeacherModal = useCallback(() => {
    setSelectedTeacher(null);
  }, []);

  // Create a memoized handler for mobile search toggle
  const toggleMobileSearch = useCallback(() => {
    setShowMobileSearch(prev => !prev);
  }, []);

  // Create a memoized handler for search term change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <Info className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Routines</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error}
        </p>
      </div>
    );
  }

  if (!currentRoutine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Routine Available</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          There are no active routines at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 sm:mb-6 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col space-y-3 md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Class Routine</h1>
            </div>
            
            <button 
              onClick={toggleMobileSearch}
              className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              aria-label={showMobileSearch ? "Hide search" : "Show search"}
            >
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentRoutine.name} - {currentRoutine.semester}
          </p>

          {routines.length > 0 && (
            <div className="relative mt-1">
              <select
                value={selectedRoutineId}
                onChange={(e) => handleRoutineChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm appearance-none space-y-6 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
              >
                {routines.map(routine => (
                  <option key={routine.id} value={routine.id}>
                    {routine.name} - {routine.semester} {routine.isActive ? "(Active)" : ""}
                  </option>
                ))}
                {isAdmin && (
                  <option value="create-new" className="font-medium text-blue-600 dark:text-blue-400">
                    + Create New Routine
                  </option>
                )}
              </select>
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <ChevronRight className="absolute right-2 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4" />
            </div>
          )}
          
          <AnimatePresence>
            {showMobileSearch && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative mt-2">
                  <input
                    type="text"
                    placeholder="Search courses, teachers, rooms..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden md:flex md:flex-row md:flex-wrap md:items-center md:justify-between gap-y-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 lg:w-7 lg:h-7 text-blue-600 dark:text-blue-400" />
              Class Routine
            </h1>
            <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 mt-1">
              {currentRoutine.name} - {currentRoutine.semester}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {routines.length > 0 && (
              <div className="relative">
                <select
                  value={selectedRoutineId}
                  onChange={(e) => handleRoutineChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none space-y-6 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                >
                  {routines.map(routine => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name} - {routine.semester} {routine.isActive ? "(Active)" : ""}
                    </option>
                  ))}
                  {isAdmin && (
                    <option value="create-new" className="font-medium text-blue-600 dark:text-blue-400">
                      + Create New Routine
                    </option>
                  )}
                </select>
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <ChevronRight className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 w-4 h-4" />
              </div>
            )}

            <div className="relative w-full sm:w-auto sm:flex-grow">
              <input
                type="text"
                placeholder="Search courses, teachers, rooms..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <button
            onClick={() => {
              const prevDay = addDays(selectedDate, -1);
              setSelectedDate(prevDay);
            }}
            className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h2>

          <button
            onClick={() => {
              const nextDay = addDays(selectedDate, 1);
              setSelectedDate(nextDay);
            }}
            className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-1.5 sm:gap-2 mb-4">
          {weekDays.map((day, i) => (
            <button 
              key={i}
              className={`flex flex-col items-center justify-center h-14 sm:h-16 py-1 px-1 rounded-lg focus:outline-none ${
                day.isSelected 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => handleDaySelect(day.date)}
            >
              <span className={`text-xs mb-0.5 ${
                day.isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {day.dayName}
              </span>
              <span className={`text-base sm:text-lg font-bold ${
                day.isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
              }`}>
                {day.dayNum}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {filteredSlots.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">
              No Classes Scheduled
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 px-4">
              There are no classes scheduled for this day
              {searchTerm && ` matching "${searchTerm}"`}.
            </p>
          </div>
        ) : (
          filteredSlots
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((slot) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700/50"
              >
                <div className="flex flex-row items-stretch h-full">
                  <div className="w-[85px] sm:w-[120px] md:w-[180px] bg-gray-50 dark:bg-gray-800/40 flex flex-col justify-between items-center py-4 sm:py-6 md:py-8 px-2 sm:px-3 md:px-4 border-r border-gray-100 dark:border-gray-700/50">
                    <div className="flex flex-col items-center">
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-gray-700 dark:text-gray-300">
                        {format(new Date(`2000-01-01T${slot.startTime}`), 'h:mm')}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-3 sm:py-4 md:py-5 w-full space-y-2 sm:space-y-3">
                      <div className="w-12 sm:w-16 md:w-20 border-t border-gray-200 dark:border-gray-600"></div>
                      <div className="w-10 sm:w-14 md:w-16 border-t border-gray-200 dark:border-gray-600"></div>
                      <div className="w-8 sm:w-12 md:w-14 border-t border-gray-200 dark:border-gray-600"></div>
                      <div className="w-10 sm:w-14 md:w-16 border-t border-gray-200 dark:border-gray-600"></div>
                      <div className="w-12 sm:w-16 md:w-20 border-t border-gray-200 dark:border-gray-600"></div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-gray-700 dark:text-gray-300">
                        {format(new Date(`2000-01-01T${slot.endTime}`), 'h:mm')}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-2.5 xs:p-3 sm:p-4 md:p-6 lg:p-8">
                    <h3 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-medium text-slate-600 dark:text-slate-300 mb-2 sm:mb-3 md:mb-4 lg:mb-6 line-clamp-2">
                      {slot.courseName || 'No Course Name'}
                    </h3>
                    
                    <div className="space-y-1.5 sm:space-y-2 md:space-y-3 lg:space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-400">Course</span>
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-800 dark:text-gray-200">{slot.courseCode || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-400">Section</span>
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-800 dark:text-gray-200">{slot.section || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-400">Teacher</span>
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg font-medium">
                          {slot.teacher && (
                            <button
                              onClick={() => handleTeacherSelect(slot.teacher)}
                              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center text-xs sm:text-sm"
                            >
                              {getInitials(slot.teacherName || 'Unknown')}
                            </button>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg text-gray-500 dark:text-gray-400">Room</span>
                        <span className="text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-800 dark:text-gray-200">{slot.roomNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
        )}
      </div>

      {selectedTeacher && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>}>
          <MemoizedTeacherDetailsModal
            teacher={selectedTeacher}
            onClose={handleCloseTeacherModal}
          />
        </Suspense>
      )}
    </div>
  );
}