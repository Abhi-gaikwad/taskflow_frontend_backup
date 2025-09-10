// import React, { useState } from 'react';
// import { NavLink } from 'react-router-dom';
// import {
//   LayoutDashboard,
//   ListTodo,
//   Users,
//   BarChart3,
//   Settings,
//   Bell,
//   Menu,
//   X,
// } from 'lucide-react';
// import { useAuth, usePermissions } from '../../contexts/AuthContext';
// import logo from '../../assets/logoNew.jpg'; // Ensure this file really exists in /src/assets/

// export const Sidebar: React.FC = () => {
//   const { user } = useAuth();
//   const { canManageUsers } = usePermissions();
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   const appTitle = user?.company?.name || 'Blasto';

//   const menuItems = [
//     { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
//     { 
//       label: 'Tasks', 
//       href: '/tasks', 
//       icon: ListTodo, 
//       show: user?.role !== 'super_admin' && user?.role !== 'company'
//     },
//     {
//       label: 'Users',
//       href: '/users',
//       icon: Users,
//       show: (user?.role === 'admin' || user?.role === 'company') && canManageUsers,
//     },
//     { label: 'Reports', href: '/reports', icon: BarChart3, show: user?.role !== 'super_admin' },
//     { 
//       label: 'Notifications', 
//       href: '/notifications', 
//       icon: Bell, 
//       show: user?.role !== 'company' // 🔹 Hide notifications for company role
//     },
//     { label: 'Settings', href: '/settings', icon: Settings, show: true },
//   ];

//   const toggleMobileMenu = () => {
//     setIsMobileMenuOpen(!isMobileMenuOpen);
//   };

//   const closeMobileMenu = () => {
//     setIsMobileMenuOpen(false);
//   };

//   return (
//     <>
//       {/* Mobile Menu Button */}
//       <button
//         onClick={toggleMobileMenu}
//         className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
//         aria-label="Toggle sidebar"
//       >
//         {isMobileMenuOpen ? (
//           <X className="w-6 h-6 text-gray-600" />
//         ) : (
//           <Menu className="w-6 h-6 text-gray-600" />
//         )}
//       </button>

//       {/* Mobile Overlay */}
//       {isMobileMenuOpen && (
//         <div
//           className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
//           onClick={closeMobileMenu}
//         />
//       )}

//       {/* Sidebar */}
//       <div
//         className={`
//           fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
//           w-64 bg-white shadow-lg h-screen flex flex-col border-r border-gray-200
//           transform transition-transform duration-300 ease-in-out
//           ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
//         `}
//       >
//         {/* Logo Section */}
//         <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
//           <div className="flex items-center space-x-3">
//             {/* Logo Image with fallback */}
//             <div className="relative">
//               <img
//                 src={logo}
//                 alt="Company Logo"
//                 onError={(e) => {
//                   const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(appTitle)}&background=4F46E5&color=ffffff`;
//                   (e.target as HTMLImageElement).src = fallback;
//                 }}
//                 className="w-10 h-10 object-contain rounded-lg bg-white shadow-sm border border-gray-200"
//               />
//             </div>

//             <div className="flex-1 min-w-0">
//               <h2 className="text-xl font-bold text-gray-900 truncate">{appTitle}</h2>
//               <div className="flex items-center space-x-2">
//                 {user?.company?.name && (
//                   <span className="inline-flex items-center px-2 py-0.4 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
//                     Dashboard
//                   </span>
//                 )}
//                 {user?.role === 'super_admin' && (
//                   <span className="inline-flex items-center px-2 py-0.4 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
//                     Pro
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Navigation Links */}
//         <nav className="flex-1 px-4 py-6 overflow-y-auto" aria-label="Sidebar Navigation">
//           <ul className="space-y-2">
//             {menuItems.map((item) =>
//               item.show ? (
//                 <li key={item.label}>
//                   <NavLink
//                     to={item.href}
//                     onClick={closeMobileMenu}
//                     className={({ is_active }) =>
//                       `group w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
//                         is_active
//                           ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
//                           : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
//                       }`
//                     }
//                   >
//                     {({ is_active }) => (
//                       <>
//                         <item.icon 
//                           className={`w-5 h-5 mr-3 transition-colors ${
//                             is_active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
//                           }`} 
//                         />
//                         {item.label}
//                         {is_active && (
//                           <div className="ml-auto">
//                             <div className="w-2 h-2 bg-white rounded-full"></div>
//                           </div>
//                         )}
//                       </>
//                     )}
//                   </NavLink>
//                 </li>
//               ) : null
//             )}
//           </ul>
//         </nav>

//         {/* Clean Footer - Just spacing */}
//         <div className="p-2"></div>
//       </div>
//     </>
//   );
// };


import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  BarChart3,
  Settings,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import logo from '../../assets/logoNew.jpg'; // Ensure this file really exists in /src/assets/

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { canManageUsers } = usePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const appTitle = user?.company?.name || 'Blasto';

  const menuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true },
    { 
      label: 'Tasks', 
      href: '/tasks', 
      icon: ListTodo, 
      show: user?.role !== 'super_admin' && user?.role !== 'company'
    },
    {
      label: 'Users',
      href: '/users',
      icon: Users,
      show: (user?.role === 'admin' || user?.role === 'company') && canManageUsers,
    },
    { label: 'Reports', href: '/reports', icon: BarChart3, show: user?.role !== 'super_admin' },
    { 
      label: 'Notifications', 
      href: '/notifications', 
      icon: Bell, 
      show: user?.role !== 'company'
    },
    { label: 'Settings', href: '/settings', icon: Settings, show: true },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-lg shadow-sm border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150"
        aria-label="Toggle sidebar"
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-64 bg-white shadow-md h-screen flex flex-col border-r border-gray-300
          transform transition-transform duration-200 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            {/* Logo Image */}
            <div className="flex-shrink-0">
              <img
                src={logo}
                alt="Company Logo"
                onError={(e) => {
                  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(appTitle)}&background=374151&color=ffffff&size=40`;
                  (e.target as HTMLImageElement).src = fallback;
                }}
                className="w-10 h-10 object-contain rounded border border-gray-200 bg-white"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate leading-tight">
                {appTitle}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {user?.company?.name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Dashboard
                  </span>
                )}
                {user?.role === 'super_admin' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto bg-white" aria-label="Sidebar Navigation">
          <ul className="space-y-1">
            {menuItems.map((item) =>
              item.show ? (
                <li key={item.label}>
                  <NavLink
                    to={item.href}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `block w-full px-4 py-2.5 text-sm font-medium rounded transition-colors duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <div className="flex items-center">
                        <item.icon 
                          className={`w-5 h-5 mr-3 flex-shrink-0 ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`} 
                        />
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </NavLink>
                </li>
              ) : null
            )}
          </ul>
        </nav>

        {/* Clean Footer */}
        <div className="p-4"></div>
      </div>
    </>
  );
};