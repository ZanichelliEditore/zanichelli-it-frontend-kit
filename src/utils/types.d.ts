export type MenuItem = {
  label: string;
  href?: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  highlight?: boolean;
  id?: string;
  group?: { id: string; label: string };
};

export type MenubarItem = Omit<MenuItem, 'group' | 'highlight'> & {
  navbarItems?: MenubarItem[];
  menuItems?: MenuItem[];
};

export type SearchEvent = {
  query?: string;
  area?: string;
  subject?: string;
  user_query?: string;
}
