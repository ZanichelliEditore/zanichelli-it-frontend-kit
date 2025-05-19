export type MenuItem = {
  label: string;
  href?: string;
  highlight?: boolean;
  id?: string;
  group?: { id: string; label: string };
};

export type MenubarItem = Omit<MenuItem, 'group'> & {
  navbarItems?: MenubarItem[];
  menuItems?: MenuItem[];
};
