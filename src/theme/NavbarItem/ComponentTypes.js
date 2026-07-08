import DefaultNavbarItem from '@theme/NavbarItem/DefaultNavbarItem';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import LocaleDropdownNavbarItem from '@theme/NavbarItem/LocaleDropdownNavbarItem';
import SearchNavbarItem from '@theme/NavbarItem/SearchNavbarItem';
import HtmlNavbarItem from '@theme/NavbarItem/HtmlNavbarItem';
import DocNavbarItem from '@theme/NavbarItem/DocNavbarItem';
import DocSidebarNavbarItem from '@theme/NavbarItem/DocSidebarNavbarItem';
import DocsVersionNavbarItem from '@theme/NavbarItem/DocsVersionNavbarItem';
import DocsVersionDropdownNavbarItem from '@theme/NavbarItem/DocsVersionDropdownNavbarItem';
import ExploreCoursesNavbarItem from '@theme/NavbarItem/ExploreCoursesNavbarItem';
import LoginNavbarItem from '@theme/NavbarItem/LoginNavbarItem';

const ComponentTypes = {
  default: DefaultNavbarItem,
  localeDropdown: LocaleDropdownNavbarItem,
  search: SearchNavbarItem,
  dropdown: DropdownNavbarItem,
  html: HtmlNavbarItem,
  doc: DocNavbarItem,
  docSidebar: DocSidebarNavbarItem,
  docsVersion: DocsVersionNavbarItem,
  docsVersionDropdown: DocsVersionDropdownNavbarItem,
  'custom-exploreCourses': ExploreCoursesNavbarItem,
  'custom-login': LoginNavbarItem,
};

export default ComponentTypes;
