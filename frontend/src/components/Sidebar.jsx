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

  useEffect(() => {
    if (isOrderRoute) {
      setIsOrderMenuOpen(true);
    }
  }, [isOrderRoute]);

  const orderSubMenus = [
    { name: 'Create lead', path: '/order/create-lead' },
    { name: 'Order', path: '/order/order' },
    { name: 'DTF Pending', path: '/order/dtf-pending' },
    { name: 'Stock', path: '/order/stock' },
    { name: 'Printing', path: '/order/printing' },
    { name: 'Quality check', path: '/order/quality-check' },
    { name: 'Packaging', path: '/order/packaging' },
    { name: 'Delivery Pending', path: '/order/delivery-pending' },
    { name: 'Delivery', path: '/order/delivery' },
    { name: 'Customer support', path: '/order/customer-support' },
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
              {orderSubMenus.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-submenu-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="submenu-dot"></span>
                  {item.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>

      </nav>
    </aside>
  );
}

export default Sidebar;