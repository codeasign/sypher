import mysqlCommands from './mysql-commands.module.css';

/**
 * Per-course article themes, keyed by course slug. A course listed here gets an
 * extra CSS-module class on its article body (CourseModuleArticle); every other
 * course keeps the default styling. To theme another course, add a
 * `<slug>.module.css` exposing a `.theme` class and register it below.
 */
const COURSE_THEME_CLASS: Record<string, string> = {
  'mysql-commands': mysqlCommands.theme,
  // The PostgreSQL course has the same wide result and plan tables, so it shares the theme.
  'postgresql-commands': mysqlCommands.theme,
  // The MongoDB course shows wide, monospaced result documents and tables, so it shares it too.
  'mongodb-commands': mysqlCommands.theme,
};

export function getCourseThemeClass(courseSlug: string | undefined): string | undefined {
  return courseSlug ? COURSE_THEME_CLASS[courseSlug] : undefined;
}
