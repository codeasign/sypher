import React from 'react';
import Link from '@docusaurus/Link';

// docs' own homepage no longer hosts the course catalog (it redirects to
// app.sypher); point this at the in-docs /courses page instead.
export default function ExploreCoursesNavbarItem() {
  return (
    <Link
      to="/courses"
      className="navbar__link explore-courses-link"
    >
      Explore Courses
    </Link>
  );
}