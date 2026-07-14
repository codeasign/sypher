import React from 'react';
import Layout from '@theme/Layout';
import CourseDetail from '../../components/CourseDetail';
import courses from '@sypher/course-catalog/src/courses';

const course = courses.find((c) => c.slug === 'ai-engineering-crash-course');

export default function AIEngineeringCrashCourse() {
  return (
    <Layout title={course.title} description={course.description}>
      <CourseDetail course={course} docUrl="/docs/ai-engineering-hands-on/" />
    </Layout>
  );
}