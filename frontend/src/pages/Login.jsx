import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import logoImg from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

function Login({ darkMode, setDarkMode }) {
  const navigate = useNavigate();
  const { profiles, currentUser, login } = useAuth();

  // Selected profile state: 'admin' | 'production' | 'stock' | 'sales'
  const [selectedProfileId, setSelectedProfileId] = useState(
    currentUser?.id || "admin"
  );
  const activeProfile = profiles[selectedProfileId] || profiles.admin;

  // Form fields
  const [email, setEmail] = useState(activeProfile.email);
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Switch profile in form
  const handleSelectProfile = (profileId) => {
    setSelectedProfileId(profileId);
    const target = profiles[profileId];
    if (target) {
      setEmail(target.email);
      setPassword("••••••••••••");
    }
  };

  const handleSignIn = (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      login(selectedProfileId, { email, rememberMe });
      setIsLoading(false);
      setIsSuccess(true);

      setTimeout(() => {
        navigate("/");
      }, 450);
    }, 550);
  };

  return (
    <div className={`login-page-container ${darkMode ? "dark" : "light"}`}>
      {/* Background Soft Ambient Overlay */}
      <div className="login-bg-overlay"></div>

      {/* Floating Top Controls Bar */}
      <header className="login-floating-top-nav">
        <div className="login-top-controls">
          <button
            className="login-pill-btn"
            onClick={() => navigate("/")}
            title="Return to Dashboard"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <button
            className="login-pill-btn login-theme-pill"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Central Card Stage */}
      <main className="login-center-stage">
        <div className="login-reference-card">
          {/* Brand Header (Wordmark like reference "vlyora") */}
          <div className="login-card-brand">
            <img
              src={logoImg}
              alt="Omission Crafting Logo"
              className="login-card-emblem"
            />
          </div>

          {/* Heading & Subheading (Editorial Serif like reference) */}
          <h1 className="login-card-heading">Welcome Back to Omission</h1>
          <p className="login-card-subheading">
            Access your account to view orders, track production queues, manage stock, and handle sales leads.
          </p>

          <div className="login-profile-segmented-grid">
            {Object.values(profiles).map((prof) => {
              const isSelected = selectedProfileId === prof.id;
              return (
                <div
                  key={prof.id}
                  className={`login-profile-chip ${isSelected ? "active" : ""}`}
                  onClick={() => handleSelectProfile(prof.id)}
                  role="button"
                  tabIndex={0}
                  title={`${prof.name} (${prof.role})`}
                >
                  <div
                    className="login-chip-avatar"
                    style={{
                      backgroundColor: prof.avatarBg,
                      color: prof.avatarColor,
                    }}
                  >
                    {prof.initials}
                  </div>
                  <span className="login-chip-name">{prof.name}</span>
                  <span className="login-chip-role">
                    {prof.id === "admin"
                      ? "CEO / Admin"
                      : prof.role === "Lead Manager"
                      ? "Lead Manager"
                      : prof.role
                          .replace(" Executive", " Exec")
                          .replace(" Room Manager", " Mgr")
                          .replace(" Lead Manager", " Lead Mgr")
                          .replace(" Lead", "")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Form with Clean Floating/Soft Inputs */}
          <form className="login-clean-form" onSubmit={handleSignIn}>
            <div className="login-input-group">
              <label className="login-input-label">
                Email<span className="login-required-star">*</span>
              </label>
              <div className="login-soft-input-wrap">
                <input
                  type="email"
                  className="login-soft-input"
                  placeholder="Type your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-input-label">
                Password<span className="login-required-star">*</span>
              </label>
              <div className="login-soft-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  className="login-soft-input"
                  placeholder="Type your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="login-support-row">
              <label className="login-custom-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <span
                className="login-forgot-pass-btn"
                onClick={() =>
                  alert(
                    `Credentials for ${activeProfile.name} (${activeProfile.role}) are auto-authenticated.`
                  )
                }
              >
                Forgot Password?
              </span>
            </div>

            {/* Primary Dark Pill Button */}
            <button
              type="submit"
              className="login-primary-pill-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="login-spinner-ref"></div>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Entering Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {activeProfile.name} ({activeProfile.role})</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Reference Footer Link */}
          <div className="login-ref-footer-text">
            <span>Don&apos;t have an account? </span>
            <a onClick={() => navigate("/")}>Return to Dashboard</a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
