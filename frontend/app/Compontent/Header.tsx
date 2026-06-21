// components/AdvancedHeader.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../Context/authContext';
import {
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  ChevronDown,
  User,
  Calendar,
  Globe,
  FileText,
  Microscope,
  Bell
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  sender: string;
  content: string;
  time: string;
}

interface SubmenuLink {
  name: string;
  href: string;
}

interface SubmenuSection {
  title: string;
  items: SubmenuLink[];
}

type SubmenuItem = SubmenuSection | SubmenuLink;

interface NavItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  submenu?: SubmenuItem[];
}

const isSectionArray = (items: SubmenuItem[]): items is SubmenuSection[] => {
  return items.length > 0 && 'items' in items[0] && Array.isArray((items[0] as SubmenuSection).items);
};

export default function AdvancedHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const processedMsgIds = useRef<Set<string>>(new Set());
  const notifTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unreadCount = notifications.length;

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Socket Notification Logic
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && user) {
      try {
        const socket = getSocket(token);
        const decoded: any = jwtDecode(token);
        const userId = decoded.id || decoded.userId;

        const handleNewMessage = (msg: any) => {
          const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
          if (senderId !== userId) {
            if (processedMsgIds.current.has(msg._id)) return;
            processedMsgIds.current.add(msg._id);

            const newNotif: Notification = {
              id: msg._id,
              sender: msg.senderId?.name || 'Someone',
              content: msg.content,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setNotifications(prev => [newNotif, ...prev]);

            toast.success(`New message from ${msg.senderId?.name || 'someone'}`, {
              icon: '💬',
            });
          }
        };

        socket.on('newMessage', handleNewMessage);
        return () => {
          socket.off('newMessage', handleNewMessage);
        };
      } catch (e) {
        console.error('Socket error in AdvancedHeader');
      }
    }
  }, [user]);

  const mainNavigation: NavItem[] = [
    {
      name: 'Sequencing Services',
      href: '/Sequence',
      icon: <Microscope className="w-4 h-4" />,
      submenu: [
        {
          title: 'NGS Sequencing',
          items: [
            { name: 'Whole Genome Sequencing', href: '/services/wgs' },
            { name: 'Exome Sequencing', href: '/services/exome-seq' },
            { name: 'Targeted Sequencing', href: '/services/targeted-seq' },
            { name: 'RNA Sequencing', href: '/services/rna-seq' },
          ]
        },
        {
          title: 'Specialized Sequencing',
          items: [
            { name: 'Single Cell Sequencing', href: '/services/single-cell' },
            { name: 'Metagenomics', href: '/services/metagenomics' },
            { name: 'Epigenomics', href: '/services/epigenomics' },
            { name: '16S/18S/ITS Sequencing', href: '/services/16s-sequencing' },
          ]
        }
      ]
    },
    {
      name: 'Technologies',
      href: '/Technologic',
      icon: <Globe className="w-4 h-4" />,
      submenu: [
        {
          title: 'Sequencing Platforms',
          items: [
            { name: 'Illumina NovaSeq', href: '/technologies/illumina' },
            { name: 'PacBio SMRT', href: '/technologies/pacbio' },
            { name: 'Oxford Nanopore', href: '/technologies/nanopore' },
            { name: 'Ion Torrent', href: '/technologies/ion-torrent' },
          ]
        },
        {
          title: 'Analysis Technologies',
          items: [
            { name: 'Bioinformatics', href: '/technologies/bioinformatics' },
            { name: 'Data Analysis', href: '/technologies/data-analysis' },
            { name: 'Cloud Computing', href: '/technologies/cloud' },
          ]
        }
      ]
    },
    {
      name: 'Resources',
      href: '/Resource',
      icon: <FileText className="w-4 h-4" />,
      submenu: [
        { name: 'Technical Notes', href: '/resources/technical-notes' },
        { name: 'Application Notes', href: '/resources/application-notes' },
        { name: 'Webinars', href: '/resources/webinars' },
        { name: 'Publications', href: '/resources/publications' },
        { name: 'Case Studies', href: '/resources/case-studies' },
        { name: 'Support Center', href: '/resources/support' },
      ]
    },
    { name: 'Company', href: '/Company' },
    { name: 'Contact', href: '/Contact' },
  ];

  const renderSubmenu = (submenuItems: SubmenuItem[], isDesktop: boolean) => {
    if (isSectionArray(submenuItems)) {
      const sections = submenuItems;
      if (isDesktop) {
        return (
          <div className="absolute top-full left-0 w-100 bg-white shadow-2xl rounded-xl border border-gray-200 mt-2 animate-in fade-in-50 zoom-in-95">
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {sections.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <h4 className="font-bold text-gray-900 text-sm mb-3 uppercase tracking-wide text-blue-600">
                      {section.title}
                    </h4>
                    <div className="space-y-2">
                      {section.items.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="block py-2 text-gray-700 hover:text-blue-600 transition-all duration-200 group text-sm"
                        >
                          <span className="group-hover:translate-x-1 transition-transform duration-200">
                            {subItem.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="ml-6 border-l-2 border-blue-100 bg-gray-50/50">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <div className="px-6 py-3 text-sm font-semibold text-blue-600 border-l-2 border-blue-500 bg-blue-50/50">
                  {section.title}
                </div>
                {section.items.map((subItem) => (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className="block px-6 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border-l-2 border-transparent hover:border-blue-400 text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {subItem.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        );
      }
    } else {
      const links = submenuItems as SubmenuLink[];
      if (isDesktop) {
        return (
          <div className="absolute top-full left-0 w-96 bg-white shadow-2xl rounded-xl border border-gray-200 mt-2 animate-in fade-in-50 zoom-in-95">
            <div className="p-6">
              <div className="space-y-1">
                {links.map((subItem) => (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    className="block px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 rounded-lg text-sm"
                  >
                    {subItem.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="ml-6 border-l-2 border-blue-100 bg-gray-50/50">
            {links.map((linkItem) => (
              <Link
                key={linkItem.name}
                href={linkItem.href}
                className="block px-6 py-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border-l-2 border-transparent hover:border-blue-400 text-sm"
                onClick={() => setIsMenuOpen(false)}
              >
                {linkItem.name}
              </Link>
            ))}
          </div>
        );
      }
    }
  };

  const handleDropdownEnter = (name: string) => {
    setActiveDropdown(name);
  };

  const handleDropdownLeave = () => {
    setActiveDropdown(null);
  };

  const handleUserDropdownToggle = () => {
    setUserDropdownOpen(!userDropdownOpen);
  };

  return (
    <>
      {/* Main Navigation */}
      <nav className={`bg-white sticky top-0 z-50 transition-all duration-500 ${isScrolled
          ? 'shadow-2xl py-2'
          : 'shadow-lg py-6 border-b border-gray-100'
        }`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className={`relative transition-all duration-500 ease-in-out flex items-center justify-center ${isScrolled ? 'w-16 h-16' : 'w-32 h-32'
                }`}>
                <img
                  src="/cag.jpg"
                  alt="Madurai BioScience Logo"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  loading="eager"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold text-gray-900">Ponnaiya's CAG</h1>
                <p className="text-sm text-gray-600 font-medium tracking-wide">Advanced Genomics Research</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center space-x-1" ref={dropdownRef}>
              <Link
                href="/"
                className="px-4 py-3 text-gray-800 hover:text-blue-600 font-semibold transition-all duration-300 hover:bg-blue-50 rounded-lg mx-1 text-sm"
              >
                Home
              </Link>

              {mainNavigation.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(item.name)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <Link
                    href={item.href}
                    className="flex items-center px-4 py-3 text-gray-800 hover:text-blue-600 font-semibold transition-all duration-300 hover:bg-blue-50 rounded-lg mx-1 text-sm"
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.name}
                    {item.submenu && <ChevronDown className={`w-4 h-4 ml-1 transition-transform duration-300 ${activeDropdown === item.name ? 'rotate-180' : ''
                      }`} />}
                  </Link>

                  {item.submenu && activeDropdown === item.name && renderSubmenu(item.submenu, true)}

                </div>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notification Bell (Only if Logged In) */}
              {mounted && user && (
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white shadow-2xl rounded-xl border border-gray-100 overflow-hidden animate-in fade-in-50 zoom-in-95">
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                        {unreadCount > 0 && <span className="text-xs text-blue-600 font-bold cursor-pointer" onClick={() => setNotifications([])}>Clear all</span>}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 text-sm">No new notifications</div>
                        ) : (
                          notifications.map((notif, idx) => (
                            <div key={idx} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-gray-900 text-sm">{notif.sender}</span>
                                <span className="text-[10px] text-gray-400">{notif.time}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{notif.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Auth Section */}
              <div className="hidden md:block relative" ref={userRef}>
                {(!mounted || !user) ? (
                  <Link
                    href="/Login/Signin"
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 text-sm font-semibold"
                  >
                    Sign In
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={handleUserDropdownToggle}
                      className="flex items-center space-x-2 p-2 text-gray-600 hover:text-blue-600 rounded-lg transition-colors duration-300"
                    >
                      <User className="w-5 h-5" />
                      <span className="text-sm font-medium text-gray-800">
                        {user.name || user.email || 'User'}
                      </span>
                    </button>
                    {userDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white shadow-2xl rounded-lg border border-gray-200 animate-in fade-in-50 zoom-in-95">
                        <div className="py-1">
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 text-sm"
                            onClick={() => setUserDropdownOpen(false)}
                          >
                            Profile
                          </Link>
                          <button
                            onClick={() => {
                              logout();
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-all duration-200 text-sm"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                className="xl:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-300"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="xl:hidden mt-4 pb-6 bg-white border-t border-gray-200 rounded-b-2xl shadow-2xl animate-in slide-in-from-top-5">
              <div className="flex flex-col space-y-1">
                <Link
                  href="/"
                  className="px-6 py-4 text-gray-800 hover:bg-blue-50 hover:text-blue-600 font-semibold transition-colors border-l-4 border-transparent hover:border-blue-500"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>

                {mainNavigation.map((item) => (
                  <div key={item.name} className="border-b border-gray-100 last:border-b-0">
                    <Link
                      href={item.href}
                      className="flex items-center justify-between px-6 py-4 text-gray-800 hover:bg-blue-50 hover:text-blue-600 font-semibold transition-colors border-l-4 border-transparent hover:border-blue-500"
                      onClick={() => !item.submenu && setIsMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        {item.icon && <span className="mr-3">{item.icon}</span>}
                        {item.name}
                      </div>
                      {item.submenu && (
                        <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                      )}
                    </Link>
                    {item.submenu && renderSubmenu(item.submenu, false)}
                  </div>
                ))}

                {/* Mobile Auth Section */}
                <div className="pt-2 mt-2 border-t border-gray-200 px-6">
                  {(!mounted || !user) ? (
                    <Link
                      href="/signin"
                      className="block w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 text-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 px-2 py-2 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-800">
                          {user.name || user.email || 'User'}
                        </span>
                      </div>
                      <Link
                        href="/profile"
                        className="block w-full text-center bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-3 rounded-lg font-semibold transition-all duration-300 text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full text-center border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 text-sm"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile CTA */}
                {(!mounted || !user) && (
                  <div className="pt-4 mt-4 border-t border-gray-200 px-6">
                    <div className="flex flex-col space-y-3">
                      <Link
                        href="/contact"
                        className="w-full text-center border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 py-4 rounded-lg font-semibold transition-all duration-300"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Contact Us
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}