import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  ReceiptText,
  CheckSquare,
  ClipboardCheck,
  Lightbulb
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.id === "admin";
  const isSales = currentUser?.role === "Sales Executive" || currentUser?.id?.startsWith("sales");
  const isLeadManager =
    currentUser?.id === "lead_manager" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase() === "lead manager");
  const isInvoiceUser = isSales || currentUser?.id === "admin" || isLeadManager;
  const isTaskUser =
    currentUser?.id === "stock" ||
    currentUser?.id === "production" ||
    currentUser?.id === "admin" ||
    Boolean(currentUser?.role && (currentUser.role.toLowerCase().includes("stock") || (currentUser.role.toLowerCase().includes("production") && !currentUser.role.toLowerCase().includes("lead manager"))));
  const isStockUser =
    currentUser?.id === "stock" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("stock"));
  const isProductionUser =
    currentUser?.id === "production" ||
    Boolean(currentUser?.role && currentUser.role.toLowerCase().includes("production") && !currentUser.role.toLowerCase().includes("lead manager"));
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isOrderRoute = location.pathname.startsWith('/order');
  const isInvoiceRoute = location.pathname.startsWith('/invoices');
  const isTaskRoute = location.pathname.startsWith('/tasks');

  const isViewingOrder = isOrderRoute && searchParams.has('id');
  const fromPath = isOrderRoute ? searchParams.get('from') : null;
  const stageParam = isOrderRoute ? (searchParams.get('stage') || 'sample') : 'sample';
  const activePath = isViewingOrder
    ? (fromPath || `/order/${stageParam}/order`)
    : location.pathname;

  const [isOrderMenuOpen, setIsOrderMenuOpen] = useState(isOrderRoute);
  const [isInvoiceMenuOpen, setIsInvoiceMenuOpen] = useState(isInvoiceRoute);
  const [isTaskMenuOpen, setIsTaskMenuOpen] = useState(isTaskRoute);

  useEffect(() => {
    setIsInvoiceMenuOpen(isInvoiceRoute);
  }, [isInvoiceRoute]);

  useEffect(() => {
    setIsTaskMenuOpen(isTaskRoute);
  }, [isTaskRoute]);

  useEffect(() => {
    setIsOrderMenuOpen(isOrderRoute);
  }, [isOrderRoute]);

  const isEmbroideryOrderRoute = activePath.startsWith('/order/embroidery');
  const isDtfOrderRoute = isOrderRoute && !isEmbroideryOrderRoute && activePath !== '/order/create-lead';

  const [openOrderGroups, setOpenOrderGroups] = useState({
    dtf: true,
    embroidery: true,
  });

  const toggleOrderGroup = (groupKey) => {
    setOpenOrderGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const [openSubMenus, setOpenSubMenus] = useState({
    leads: isOrderRoute && (activePath.startsWith('/order/leads') || activePath === '/order/leads'),
    sample: isOrderRoute && activePath.startsWith('/order/sample'),
    partial: isOrderRoute && activePath.startsWith('/order/partial'),
    complete: isOrderRoute && activePath.startsWith('/order/complete'),
    embroideryLeads: isOrderRoute && activePath.startsWith('/order/embroidery/leads'),
    embroiderySample: isOrderRoute && activePath.startsWith('/order/embroidery/sample'),
  });

  useEffect(() => {
    if (!isOrderRoute) {
      setOpenSubMenus({
        leads: false,
        sample: false,
        partial: false,
        complete: false,
        embroideryLeads: false,
        embroiderySample: false,
      });
    } else if (activePath.startsWith('/order/embroidery/sample')) {
      setOpenSubMenus(prev => ({ ...prev, embroiderySample: true }));
    } else if (activePath.startsWith('/order/embroidery/leads')) {
      setOpenSubMenus(prev => ({ ...prev, embroideryLeads: true }));
    } else if (activePath.startsWith('/order/leads')) {
      setOpenSubMenus(prev => ({ ...prev, leads: true }));
    } else if (activePath.startsWith('/order/sample')) {
      setOpenSubMenus(prev => ({ ...prev, sample: true }));
    } else if (activePath.startsWith('/order/partial')) {
      setOpenSubMenus(prev => ({ ...prev, partial: true }));
    } else if (activePath.startsWith('/order/complete')) {
      setOpenSubMenus(prev => ({ ...prev, complete: true }));
    }
  }, [isOrderRoute, activePath]);

  const toggleSubMenu = (menuKey) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isDtfTask =
    activePath === "/tasks/verification" ||
    activePath === "/tasks/ready-to-pick" ||
    activePath === "/tasks/staging-room";
  const isEmbroideryTask =
    activePath.startsWith("/tasks/embroidery");

  const [openTaskSubMenus, setOpenTaskSubMenus] = useState({
    dtf: true,
    embroidery: true,
  });

  const toggleTaskSubMenu = (menuKey) => {
    setOpenTaskSubMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const sampleItems = [
    { name: 'All', path: '/order/sample/all' },
    { name: 'Order', path: '/order/sample/order' },
    { name: 'DTF Pending', path: '/order/sample/dtf-pending' },
    { name: 'Stock', path: '/order/sample/stock' },
    { name: 'Printing', path: '/order/sample/printing' },
    { name: 'Ready to Pick Up', path: '/order/sample/ready-to-pick-up' },
    { name: 'Staging Room', path: '/order/sample/staging-room' },
    { name: 'Customer Approval Awaiting', path: '/order/sample/customer-approval-awaiting' },
  ];

  const partialItems = [
    { name: 'All', path: '/order/partial/all' },
    { name: 'Order', path: '/order/partial/order' },
    { name: 'DTF Pending', path: '/order/partial/dtf-pending' },
    { name: 'Stock', path: '/order/partial/stock' },
    { name: 'Printing', path: '/order/partial/printing' },
    { name: 'Quality Check', path: '/order/partial/quality-check' },
    { name: 'Packaging', path: '/order/partial/packaging' },
    { name: 'Staging Room', path: '/order/partial/staging-room' },
    { name: 'Payment Confirmation', path: '/order/partial/payment-confirmation' },
  ];

  const completeItems = [
    { name: 'All', path: '/order/complete/all' },
    { name: 'Order', path: '/order/complete/order' },
    { name: 'DTF Pending', path: '/order/complete/dtf-pending' },
    { name: 'Stock', path: '/order/complete/stock' },
    { name: 'Printing', path: '/order/complete/printing' },
    { name: 'Quality Check', path: '/order/complete/quality-check' },
    { name: 'Packaging', path: '/order/complete/packaging' },
    { name: 'Delivery Pending', path: '/order/complete/delivery-pending' },
    { name: 'Delivered', path: '/order/complete/delivered' },
  ];

  const embroiderySampleItems = [
    { name: 'All', path: '/order/embroidery/sample/all' },
    { name: 'Order', path: '/order/embroidery/sample/order' },
    { name: 'Stock Dispatch', path: '/order/embroidery/sample/stock-dispatch' },
    { name: 'Vendor Received', path: '/order/embroidery/sample/vendor-received' },
    { name: 'Vendor Dispatch at Staging Room', path: '/order/embroidery/sample/vendor-dispatch-at-staging-room' },
    { name: 'Delivery Pending', path: '/order/embroidery/sample/delivery-pending' },
    { name: 'Delivered', path: '/order/embroidery/sample/delivered' },
    { name: 'Customer Support', path: '/order/embroidery/sample/customer-support' },
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

        {isAdmin && (
          <NavLink
            to="/employees"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <Users size={20} />
            <span>All Employees</span>
          </NavLink>
        )}

        {(isLeadManager || isAdmin) && (
          <NavLink
            to="/approvals"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <ClipboardCheck size={20} />
            <span>Approval</span>
          </NavLink>
        )}

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
                  `sidebar-submenu-item ${(isActive && !isViewingOrder) ? "active" : ""}`
                }
              >
                <span className="submenu-dot"></span>
                Create lead
              </NavLink>

              {/* 2. DTF Section */}
              <div className="sidebar-nested-accordion">
                <div
                  className={`sidebar-submenu-header ${isDtfOrderRoute ? 'active' : ''}`}
                  onClick={() => toggleOrderGroup('dtf')}
                >
                  <div className="submenu-header-content">
                    <span className="submenu-dot"></span>
                    <span>DTF</span>
                  </div>
                  {openOrderGroups.dtf ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                {openOrderGroups.dtf && (
                  <div className="sidebar-childmenu">
                    {/* All */}
                    <NavLink
                      to="/order/all"
                      className={({ isActive }) =>
                        `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === '/order/all')) ? "active" : ""}`
                      }
                    >
                      <span className="childmenu-dot"></span>
                      All
                    </NavLink>

                    {/* Lead */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isOrderRoute && activePath.startsWith('/order/leads') ? 'active' : ''}`}
                        onClick={() => toggleSubMenu('leads')}
                      >
                        <div className="submenu-header-content">
                          <span className="submenu-dot"></span>
                          <span>Lead</span>
                        </div>
                        {openSubMenus.leads ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      {openSubMenus.leads && (
                        <div className="sidebar-childmenu">
                          <NavLink
                            to="/order/leads"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === '/order/leads')) ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Leads
                          </NavLink>
                        </div>
                      )}
                    </div>

                    {/* Sample */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isOrderRoute && activePath.startsWith('/order/sample') ? 'active' : ''}`}
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
                                `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === item.path)) ? "active" : ""}`
                              }
                            >
                              <span className="childmenu-dot"></span>
                              {item.name}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Partial */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isOrderRoute && activePath.startsWith('/order/partial') ? 'active' : ''}`}
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
                                `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === item.path)) ? "active" : ""}`
                              }
                            >
                              <span className="childmenu-dot"></span>
                              {item.name}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Complete */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isOrderRoute && activePath.startsWith('/order/complete') ? 'active' : ''}`}
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
                                `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === item.path)) ? "active" : ""}`
                              }
                            >
                              <span className="childmenu-dot"></span>
                              {item.name}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Customer support */}
                    <NavLink
                      to="/order/customer-support"
                      className={({ isActive }) =>
                        `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === '/order/customer-support')) ? "active" : ""}`
                      }
                    >
                      <span className="childmenu-dot"></span>
                      Customer support
                    </NavLink>
                  </div>
                )}
              </div>

              {/* 3. Embroidery Section */}
              <div className="sidebar-nested-accordion">
                <div
                  className={`sidebar-submenu-header ${isEmbroideryOrderRoute ? 'active' : ''}`}
                  onClick={() => toggleOrderGroup('embroidery')}
                >
                  <div className="submenu-header-content">
                    <span className="submenu-dot"></span>
                    <span>Embroidery</span>
                  </div>
                  {openOrderGroups.embroidery ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                {openOrderGroups.embroidery && (
                  <div className="sidebar-childmenu">
                    {/* All */}
                    <NavLink
                      to="/order/embroidery/all"
                      className={({ isActive }) =>
                        `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === '/order/embroidery/all')) ? "active" : ""}`
                      }
                    >
                      <span className="childmenu-dot"></span>
                      All
                    </NavLink>

                    {/* Lead */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isOrderRoute && activePath.startsWith('/order/embroidery/leads') ? 'active' : ''}`}
                        onClick={() => toggleSubMenu('embroideryLeads')}
                      >
                        <div className="submenu-header-content">
                          <span className="submenu-dot"></span>
                          <span>Lead</span>
                        </div>
                        {openSubMenus.embroideryLeads ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      {openSubMenus.embroideryLeads && (
                        <div className="sidebar-childmenu">
                          <NavLink
                            to="/order/embroidery/leads"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === '/order/embroidery/leads')) ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Leads
                          </NavLink>
                        </div>
                      )}
                    </div>

                    {/* Sample */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isOrderRoute && activePath.startsWith('/order/embroidery/sample') ? 'active' : ''}`}
                        onClick={() => toggleSubMenu('embroiderySample')}
                      >
                        <div className="submenu-header-content">
                          <span className="submenu-dot"></span>
                          <span>Sample</span>
                        </div>
                        {openSubMenus.embroiderySample ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      {openSubMenus.embroiderySample && (
                        <div className="sidebar-childmenu">
                          {embroiderySampleItems.map((item) => (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              className={({ isActive }) =>
                                `sidebar-childmenu-item ${(isActive || (isOrderRoute && activePath === item.path)) ? "active" : ""}`
                              }
                            >
                              <span className="childmenu-dot"></span>
                              {item.name}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Section for Sales Executive, Lead Manager & Admin */}
        {isInvoiceUser && (
          <div className="sidebar-accordion">
            <div
              className={`sidebar-item ${isInvoiceRoute ? "active" : ""}`}
              onClick={() => setIsInvoiceMenuOpen(!isInvoiceMenuOpen)}
              style={{ cursor: "pointer" }}
            >
              <ReceiptText size={20} />
              <span>Invoice</span>
              <div className="menu-toggle" style={{ marginLeft: "auto", display: "flex" }}>
                {isInvoiceMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {isInvoiceMenuOpen && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/invoices"
                  end
                  className={({ isActive }) =>
                    `sidebar-submenu-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="submenu-dot"></span>
                  Invoices List
                </NavLink>

                <NavLink
                  to="/invoices/create"
                  className={({ isActive }) =>
                    `sidebar-submenu-item ${isActive ? "active" : ""}`
                  }
                >
                  <span className="submenu-dot"></span>
                  Create Invoice
                </NavLink>
              </div>
            )}
          </div>
        )}

        {/* TEMP: Demo Page Ideas — Divyanshi (sales) only. Temporary for client review; remove after idea is approved. */}
        {currentUser?.id === "sales" && (
          <NavLink
            to="/demo-ideas"
            className={({ isActive }) =>
              `sidebar-item ${isActive ? "active" : ""}`
            }
          >
            <Lightbulb size={20} />
            <span>Demo Page Ideas</span>
          </NavLink>
        )}

        {/* Task Section */}
        {isTaskUser && (
          <div className="sidebar-accordion">
            <div
              className={`sidebar-item ${isTaskRoute ? "active" : ""}`}
              onClick={() => setIsTaskMenuOpen(!isTaskMenuOpen)}
              style={{ cursor: "pointer" }}
            >
              <CheckSquare size={20} />
              <span>Task</span>
              <div className="menu-toggle" style={{ marginLeft: "auto", display: "flex" }}>
                {isTaskMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {isTaskMenuOpen && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/tasks/all"
                  className={({ isActive }) =>
                    `sidebar-submenu-item ${
                      isActive || location.pathname === "/tasks"
                        ? "active"
                        : ""
                    }`
                  }
                >
                  <span className="submenu-dot"></span>
                  ALL
                </NavLink>

                {/* Stock Room Manager Submenus */}
                {(isStockUser || isAdmin) && (
                  <>
                    {/* DTF Section */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isDtfTask ? "active" : ""}`}
                        onClick={() => toggleTaskSubMenu("dtf")}
                      >
                        <div className="submenu-header-content">
                          <span className="submenu-dot"></span>
                          <span>DTF</span>
                        </div>
                        {openTaskSubMenus.dtf ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      {openTaskSubMenus.dtf && (
                        <div className="sidebar-childmenu">
                          <NavLink
                            to="/tasks/verification"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${isActive ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Verification
                          </NavLink>

                          <NavLink
                            to="/tasks/ready-to-pick"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${isActive ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Ready to Pick
                          </NavLink>

                          <NavLink
                            to="/tasks/staging-room"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${isActive ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Staging Room
                          </NavLink>
                        </div>
                      )}
                    </div>

                    {/* Embroidery Section */}
                    <div className="sidebar-nested-accordion">
                      <div
                        className={`sidebar-submenu-header ${isEmbroideryTask ? "active" : ""}`}
                        onClick={() => toggleTaskSubMenu("embroidery")}
                      >
                        <div className="submenu-header-content">
                          <span className="submenu-dot"></span>
                          <span>Embroidery</span>
                        </div>
                        {openTaskSubMenus.embroidery ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      {openTaskSubMenus.embroidery && (
                        <div className="sidebar-childmenu">
                          <NavLink
                            to="/tasks/embroidery-verification"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${isActive ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Verification
                          </NavLink>

                          <NavLink
                            to="/tasks/embroidery-ready-to-pick"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${isActive ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Ready to Pick
                          </NavLink>

                          <NavLink
                            to="/tasks/embroidery-staging-room"
                            className={({ isActive }) =>
                              `sidebar-childmenu-item ${isActive ? "active" : ""}`
                            }
                          >
                            <span className="childmenu-dot"></span>
                            Embroidery Staging Room
                          </NavLink>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Production Lead Manager Submenus */}
                {(isProductionUser || isAdmin) && (
                  <>
                    <NavLink
                      to="/tasks/logo-printing"
                      className={({ isActive }) =>
                        `sidebar-submenu-item ${isActive ? "active" : ""}`
                      }
                    >
                      <span className="submenu-dot"></span>
                      Logo Printing
                    </NavLink>

                    <NavLink
                      to="/tasks/logo-cutting"
                      className={({ isActive }) =>
                        `sidebar-submenu-item ${isActive ? "active" : ""}`
                      }
                    >
                      <span className="submenu-dot"></span>
                      Logo Cutting
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </nav>
    </aside>
  );
}

export default Sidebar;