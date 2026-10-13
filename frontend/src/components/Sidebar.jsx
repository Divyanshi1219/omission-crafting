import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  ChevronDown,
  ChevronRight
} from "lucide-react";

function Sidebar() {
  const location = useLocation();
  const isOrderRoute = location.pathname.startsWith('/order');
  const [isOrderMenuOpen, setIsOrderMenuOpen] = useState(isOrderRoute);

  const [openSubMenus, setOpenSubMenus] = useState({
    sample: location.pathname.startsWith('/order/sample'),
    partial: location.pathname.startsWith('/order/partial'),
    complete: location.pathname.startsWith('/order/complete'),
  });

  useEffect(() => {
    if (isOrderRoute) {
      setIsOrderMenuOpen(true);
    }
  }, [isOrderRoute]);

  useEffect(() => {
    if (location.pathname.startsWith('/order/sample')) {
      setOpenSubMenus(prev => ({ ...prev, sample: true }));
    } else if (location.pathname.startsWith('/order/partial')) {
      setOpenSubMenus(prev => ({ ...prev, partial: true }));
    } else if (location.pathname.startsWith('/order/complete')) {
      setOpenSubMenus(prev => ({ ...prev, complete: true }));
    }
  }, [location.pathname]);

  const toggleSubMenu = (menuKey) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const sampleItems = [
    { name: 'Leads', path: '/order/sample/leads' },
    { name: 'Order', path: '/order/sample/order' },
    { name: 'DTF Pending', path: '/order/sample/dtf-pending' },
    { name: 'Stock', path: '/order/sample/stock' },
    { name: 'Printing', path: '/order/sample/printing' },
    { name: 'Customer Approved', path: '/order/sample/customer-approved' },
  ];

  const partialItems = [
    { name: 'Leads', path: '/order/partial/leads' },
    { name: 'Order', path: '/order/partial/order' },
    { name: 'DTF Pending', path: '/order/partial/dtf-pending' },
    { name: 'Stock', path: '/order/partial/stock' },
    { name: 'Printing', path: '/order/partial/printing' },
    { name: 'Quality Check', path: '/order/partial/quality-check' },
    { name: 'Payment Status', path: '/order/partial/payment-status' },
  ];

  const completeItems = [
    { name: 'Leads', path: '/order/complete/leads' },
    { name: 'Order', path: '/order/complete/order' },
    { name: 'DTF Pending', path: '/order/complete/dtf-pending' },
    { name: 'Stock', path: '/order/complete/stock' },
    { name: 'Printing', path: '/order/complete/printing' },
    { name: 'Quality Check', path: '/order/complete/quality-check' },
    { name: 'Packaging', path: '/order/complete/packaging' },
    { name: 'Delivery Pending', path: '/order/complete/delivery-pending' },
    { name: 'Delivery', path: '/order/complete/delivery' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-menu">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >
          <Users size={20} />
          <span>All Employees</span>
        </NavLink>

        <div className="sidebar-accordion">
          <div 
            className={`sidebar-item ${isOrderRoute ? 'active' : ''}`} 
            onClick={() => setIsOrderMenuOpen(!isOrderMenuOpen)}
            style={{ cursor: 'pointer' }}
          >
            <ShoppingCart size={20} />
            <span>Order Management</span>
            <div className="menu-toggle" style={{ marginLeft: 'auto', display: 'flex' }}>
              {isOrderMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </div>
          
          {isOrderMenuOpen && (
            <div className="sidebar-submenu">
              {/* 1. Create Lead */}
              <NavLink
                to="/order/create-lead"
                className={({ isActive }) =>
                  `sidebar-submenu-item ${isActive ? "active" : ""}`
                }
              >
                <span className="submenu-dot"></span>
                Create lead
              </NavLink>

              {/* 2. Sample */}
              <div className="sidebar-nested-accordion">
                <div 
                  className={`sidebar-submenu-header ${location.pathname.startsWith('/order/sample') ? 'active' : ''}`}
                  onClick={() => toggleSubMenu('sample')}
                >
                  <div className="submenu-header-content">
                    <span className="submenu-dot"></span>
                    <span>Sample</span>
                  </div>
                  {openSubMenus.sample ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                {openSubMenus.sample && (
                  <div className="sidebar-childmenu">
                    {sampleItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `sidebar-childmenu-item ${isActive ? "active" : ""}`
                        }
                      >
                        <span className="childmenu-dot"></span>
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Partial */}
              <div className="sidebar-nested-accordion">
                <div 
                  className={`sidebar-submenu-header ${location.pathname.startsWith('/order/partial') ? 'active' : ''}`}
                  onClick={() => toggleSubMenu('partial')}
                >
                  <div className="submenu-header-content">
                    <span className="submenu-dot"></span>
                    <span>Partial</span>
                  </div>
                  {openSubMenus.partial ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                {openSubMenus.partial && (
                  <div className="sidebar-childmenu">
                    {partialItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `sidebar-childmenu-item ${isActive ? "active" : ""}`
                        }
                      >
                        <span className="childmenu-dot"></span>
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Complete */}
              <div className="sidebar-nested-accordion">
                <div 
                  className={`sidebar-submenu-header ${location.pathname.startsWith('/order/complete') ? 'active' : ''}`}
                  onClick={() => toggleSubMenu('complete')}
                >
                  <div className="submenu-header-content">
                    <span className="submenu-dot"></span>
                    <span>Complete</span>
                  </div>
                  {openSubMenus.complete ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                {openSubMenus.complete && (
                  <div className="sidebar-childmenu">
                    {completeItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `sidebar-childmenu-item ${isActive ? "active" : ""}`
                        }
                      >
                        <span className="childmenu-dot"></span>
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Customer support */}
              <NavLink
                to="/order/customer-support"
                className={({ isActive }) =>
                  `sidebar-submenu-item ${isActive ? "active" : ""}`
                }
              >
                <span className="submenu-dot"></span>
                Customer support
              </NavLink>
            </div>
          )}
        </div>

      </nav>
    </aside>
  );
}

export default Sidebar;