import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Settings, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Terminal as TerminalIcon, 
  FileText, 
  Mail, 
  Users, 
  TrendingUp, 
  BarChart3, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  Plus, 
  Database, 
  Sparkles, 
  Globe, 
  Building2, 
  Tag,
  Copy,
  ChevronRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'dashboard'
  const [showSettings, setShowSettings] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('logs'); // 'logs' | 'report' | 'email'
  
  // Leads & Job Tracking
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState(null);
  
  // Config & API status
  const [config, setConfig] = useState({
    hasGemini: false,
    hasOpenAI: false,
    hasResend: false,
    hasSMTP: false,
    hasGoogleAuth: false,
    hasGoogleSheets: false,
    hasGoogleDrive: false,
    hasDatabase: false,
    databaseMode: 'Local JSON Sandbox Mode',
    SMTP_FROM: ''
  });

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    website: '',
    industry: 'SaaS / Tech'
  });

  const [settingsForm, setSettingsForm] = useState({
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    RESEND_API_KEY: '',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'SimplifIQ Audit <audit@simplifiq.ai>',
    GOOGLE_SERVICE_ACCOUNT_JSON: '',
    GOOGLE_SHEETS_ID: '',
    GOOGLE_DRIVE_FOLDER_ID: '',
    DATABASE_URL: ''
  });

  // Refs
  const terminalEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeJob?.logs]);

  // Fetch leads and configuration on mount
  useEffect(() => {
    fetchLeads();
    fetchConfig();
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const response = await fetch(`${API_BASE}/api/leads`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
        // Default select first lead if nothing selected yet
        if (data.length > 0 && !selectedLead && !activeJob) {
          setSelectedLead(data[0]);
          setActiveDetailTab('report');
        }
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  };

  // Submit Lead Intake Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.companyName) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsSubmitting(true);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    try {
      const response = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        showToast('Lead submitted! Launching automated research pipeline...');
        
        // Setup initial job state
        const initialJob = {
          id: data.jobId,
          leadInfo: formData,
          status: 'PENDING',
          progress: 5,
          logs: ['[System] Submitting intake payload...', '[System] Job registered in worker queue.']
        };
        
        setActiveJob(initialJob);
        setSelectedLead(null); // Deselect previous lead
        setActiveDetailTab('logs'); // Open logs tab
        setActiveTab('dashboard'); // Switch to dashboard view
        
        // Reset intake form
        setFormData({
          name: '',
          email: '',
          companyName: '',
          website: '',
          industry: 'SaaS / Tech'
        });

        // Start live polling of background job
        pollJobStatus(data.jobId);
      } else {
        const errData = await response.json();
        showToast(errData.error || 'Submission failed.', 'error');
      }
    } catch (err) {
      showToast('Network error, please verify backend is active.', 'error');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll background worker for live status
  const pollJobStatus = (jobId) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        if (response.ok) {
          const job = await response.json();
          setActiveJob(job);
          
          if (job.status === 'COMPLETED') {
            clearInterval(pollIntervalRef.current);
            showToast('Automation workflow complete! Audit sent to prospect.');
            
            // Refresh leads database
            await fetchLeads();
            
            // Set newly created lead as selected
            if (job.result) {
              setSelectedLead(job.result);
              setActiveJob(null); // Clear active job tracking
              setActiveDetailTab('report'); // Open report tab
            }
          } else if (job.status === 'FAILED') {
            clearInterval(pollIntervalRef.current);
            showToast('Workflow encountered a terminal failure. Review logs for details.', 'error');
            await fetchLeads();
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 850);
  };

  // Open Settings drawer & preload configuration
  const handleOpenSettings = async () => {
    setShowSettings(true);
    try {
      const response = await fetch(`${API_BASE}/api/config`);
      if (response.ok) {
        // Note: Raw keys aren't returned for safety, but we can fill placeholders or clear them
        setSettingsForm({
          GEMINI_API_KEY: '',
          OPENAI_API_KEY: '',
          RESEND_API_KEY: '',
          SMTP_HOST: '',
          SMTP_PORT: '587',
          SMTP_USER: '',
          SMTP_PASS: '',
          SMTP_FROM: config.SMTP_FROM || 'SimplifIQ Audit <audit@simplifiq.ai>',
          GOOGLE_SERVICE_ACCOUNT_JSON: '',
          GOOGLE_SHEETS_ID: '',
          GOOGLE_DRIVE_FOLDER_ID: '',
          DATABASE_URL: ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Config to Server
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    
    // Filter out empty settings so we don't clear keys unless intended
    const updates = {};
    Object.entries(settingsForm).forEach(([key, val]) => {
      if (val.trim()) {
        updates[key] = val;
      }
    });

    try {
      const response = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        showToast('Settings saved successfully!');
        setShowSettings(false);
        fetchConfig();
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showToast('Network error saving config.', 'error');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  // Get active step index for the progress bar
  const getActiveStepIndex = (status) => {
    const steps = ['PENDING', 'ENRICHING', 'ANALYZING', 'GENERATING_PDF', 'SENDING_EMAIL', 'ARCHIVING_PDF', 'LOGGING_LEAD', 'COMPLETED'];
    // Map intermediate backend states
    if (status === 'RUNNING') return 1;
    const idx = steps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  // Compute summary stats for dashboard
  const totalLeads = leads.length;
  const avgScore = totalLeads > 0 
    ? Math.round(leads.reduce((acc, l) => acc + (l.seoScore || 0), 0) / totalLeads) 
    : 0;
  const emailsSent = leads.filter(l => l.emailStatus === 'DISPATCHED').length;
  const mockDeliveries = leads.filter(l => l.emailProvider === 'simulated_sandbox').length;

  return (
    <div className="container animate-fade-in">
      {/* HEADER NAVBAR */}
      <header className="navbar glass">
        <div className="brand">
          <Layers size={28} className="brand-icon" />
          <span className="brand-text neon-text">Simplif<span className="neon-accent">IQ</span></span>
        </div>
        
        <div className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            <Plus size={16} /> Lead Intake
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              fetchLeads();
            }}
          >
            <BarChart3 size={16} /> Dashboard
          </button>

          <button 
            className="settings-btn"
            onClick={handleOpenSettings}
            title="Configure System APIs"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* TOAST ALERTS */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
          {toast.type === 'error' ? <AlertCircle size={20} className="danger-glow" /> : <CheckCircle size={20} className="success-glow" />}
          <span className="toast-msg">{toast.message}</span>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main>
        {activeTab === 'form' ? (
          /* ==========================================
             VIEW A: LEAD INTAKE PORTAL
             ========================================== */
          <div className="form-container">
            <div className="form-card glass">
              <div className="form-header">
                <h2>Generate Business Audit</h2>
                <p>Submit company details to automatically research operations, generate SWOT analyses, render PDF roadmaps, and dispatch emails.</p>
              </div>

              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label htmlFor="name"><Users size={14} /> Full Name *</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    className="form-input" 
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email"><Mail size={14} /> Email Address *</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    className="form-input" 
                    placeholder="e.g. john@company.com"
                    value={formData.email}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="companyName"><Building2 size={14} /> Company Name *</label>
                  <input 
                    type="text" 
                    id="companyName" 
                    name="companyName" 
                    className="form-input" 
                    placeholder="e.g. Acme Corporation"
                    value={formData.companyName}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="website"><Globe size={14} /> Website URL</label>
                  <input 
                    type="text" 
                    id="website" 
                    name="website" 
                    className="form-input" 
                    placeholder="e.g. acme.com (optional)"
                    value={formData.website}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="industry"><Tag size={14} /> Industry Sector</label>
                  <select 
                    id="industry" 
                    name="industry" 
                    className="form-select"
                    value={formData.industry}
                    onChange={handleFormChange}
                  >
                    <option value="SaaS / Tech">SaaS / Tech / Software</option>
                    <option value="Consulting / Professional Services">Consulting / Professional Services</option>
                    <option value="Finance / Investing / Banking">Finance / Insurance / Banking</option>
                    <option value="B2B Manufacturing / Services">B2B Manufacturing / Services</option>
                    <option value="Retail / E-Commerce">Retail / E-Commerce / Consumer</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="spinner" size={18} /> Processing Pipeline...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Initiate Automated Audit
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ==========================================
             VIEW B: OPERATIONS DASHBOARD
             ========================================== */
          <div className="dashboard-container">
            {/* STATS OVERVIEW */}
            <section className="stats-grid">
              <div className="stat-card glass">
                <div className="stat-icon primary">
                  <Database size={24} />
                </div>
                <div className="stat-content">
                  <h4>Total Leads</h4>
                  <div className="number">{totalLeads}</div>
                  <div className="desc">Logged in database</div>
                </div>
              </div>

              <div className="stat-card glass">
                <div className="stat-icon secondary">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <h4>Avg SEO Score</h4>
                  <div className="number">{avgScore}%</div>
                  <div className="desc">Across processed URLs</div>
                </div>
              </div>

              <div className="stat-card glass">
                <div className="stat-icon success">
                  <CheckCircle size={24} />
                </div>
                <div className="stat-content">
                  <h4>Outreach Delivery</h4>
                  <div className="number">{emailsSent}</div>
                  <div className="desc">{mockDeliveries > 0 ? `${mockDeliveries} sandbox logs` : 'live transactions'}</div>
                </div>
              </div>

              <div className="stat-card glass">
                <div className="stat-icon warning">
                  <Server size={24} />
                </div>
                <div className="stat-content">
                  <h4>Connected APIs</h4>
                  <div className="number">
                    {Object.values(config).filter(v => v === true).length} / 7
                  </div>
                  <div className="desc">Active cloud credentials</div>
                </div>
              </div>
            </section>

            {/* DASHBOARD SPLIT WORKSPACE */}
            <div className="dashboard-layout">
              {/* SIDEBAR: LEADS GRID */}
              <aside className="sidebar glass">
                <div className="sidebar-header">
                  <Users size={18} className="brand-icon" />
                  <span>Submissions ({leads.length})</span>
                </div>
                
                <div className="leads-list">
                  {/* Current Active Job Card (if running) */}
                  {activeJob && (
                    <div className="lead-item active">
                      <div className="lead-item-header">
                        <span className="lead-company">{activeJob.leadInfo.companyName}</span>
                        <span className="status-badge running">Running</span>
                      </div>
                      <div className="lead-name">Contact: {activeJob.leadInfo.name}</div>
                      <div className="lead-footer">
                        <span className="lead-web">{activeJob.leadInfo.website || 'No site'}</span>
                        <span className="lead-date">just now</span>
                      </div>
                    </div>
                  )}

                  {/* Historical Leads */}
                  {loadingLeads && leads.length === 0 ? (
                    <div className="empty-state">
                      <RefreshCw size={24} className="spinner" />
                      <p>Loading Leads Tracker...</p>
                    </div>
                  ) : leads.length === 0 && !activeJob ? (
                    <div className="empty-state">
                      <Database size={32} />
                      <p>No leads recorded yet.<br/>Submit the form to trigger the workflow.</p>
                    </div>
                  ) : (
                    leads.map(lead => (
                      <div 
                        key={lead.id} 
                        className={`lead-item ${selectedLead?.id === lead.id ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedLead(lead);
                          setActiveJob(null); // Switch off active job view
                          if (activeDetailTab === 'logs') setActiveDetailTab('report');
                        }}
                      >
                        <div className="lead-item-header">
                          <span className="lead-company">{lead.leadInfo.companyName}</span>
                          <span className={`status-badge ${lead.emailStatus === 'FAILED' ? 'failed' : 'completed'}`}>
                            {lead.emailStatus === 'FAILED' ? 'Failed' : 'Success'}
                          </span>
                        </div>
                        <div className="lead-name">Contact: {lead.leadInfo.name}</div>
                        <div className="lead-footer">
                          <span className="lead-web">{lead.leadInfo.website || 'No website'}</span>
                          <span className="lead-date">
                            {new Date(lead.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </aside>

              {/* DETAILED PANE WORKSPACE */}
              <section className="details-pane glass">
                {/* Header info */}
                {activeJob || selectedLead ? (
                  <>
                    <div className="details-header">
                      <div className="details-title">
                        <h3>
                          {activeJob ? activeJob.leadInfo.companyName : selectedLead.leadInfo.companyName}
                        </h3>
                        <p>
                          <Building2 size={12} /> 
                          {activeJob ? activeJob.leadInfo.industry : selectedLead.leadInfo.industry}
                          <span style={{color: 'var(--text-muted)'}}>•</span>
                          <Globe size={12} />
                          {activeJob ? (activeJob.leadInfo.website || 'N/A') : (selectedLead.leadInfo.website || 'N/A')}
                        </p>
                      </div>

                      <div className="details-actions">
                        {/* Google Sheet badge if logged */}
                        {selectedLead?.sheetsLogged && (
                          <div className="api-status-badge active" title="Lead synced to Sheets API">
                            <span className="status-dot"></span> <FileSpreadsheet size={12} /> Sync Active
                          </div>
                        )}

                        {/* Direct PDF Actions */}
                        {selectedLead && (
                          <>
                            {selectedLead.driveLink && (
                              <a 
                                href={selectedLead.driveLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="action-btn"
                              >
                                <ExternalLink size={14} /> Drive Folder
                              </a>
                            )}
                            <a 
                              href={`${API_BASE}/api/leads/${selectedLead.id}/pdf`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="action-btn primary"
                            >
                              <Download size={14} /> Download PDF
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Navigation Tabs for details */}
                    <div className="details-tabs">
                      {activeJob && (
                        <button 
                          className={`tab-btn ${activeDetailTab === 'logs' ? 'active' : ''}`}
                          onClick={() => setActiveDetailTab('logs')}
                        >
                          <TerminalIcon size={14} /> Live Logs
                        </button>
                      )}
                      
                      {selectedLead && (
                        <>
                          <button 
                            className={`tab-btn ${activeDetailTab === 'report' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('report')}
                          >
                            <FileText size={14} /> Business Audit Report
                          </button>
                          
                          <button 
                            className={`tab-btn ${activeDetailTab === 'email' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('email')}
                          >
                            <Mail size={14} /> Personalized Outreach
                          </button>

                          <button 
                            className={`tab-btn ${activeDetailTab === 'logs' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('logs')}
                          >
                            <TerminalIcon size={14} /> Execution logs
                          </button>
                        </>
                      )}
                    </div>

                    {/* Detailed Tab content renders */}
                    <div className="details-content">
                      {/* TAB 1: MONOSPACE LOGS */}
                      {activeDetailTab === 'logs' && (
                        <div className="logs-panel">
                          {/* Live graphical nodes progress bar */}
                          <div className="steps-timeline">
                            {[
                              { label: 'Intake', step: 'PENDING' },
                              { label: 'Scrape', step: 'ENRICHING' },
                              { label: 'AI Audit', step: 'ANALYZING' },
                              { label: 'PDF Kit', step: 'GENERATING_PDF' },
                              { label: 'Email', step: 'SENDING_EMAIL' },
                              { label: 'Logging', step: 'LOGGING_LEAD' }
                            ].map((step, index) => {
                              const activeJobIndex = activeJob ? getActiveStepIndex(activeJob.status) : 9;
                              const isCompleted = activeJob ? index < activeJobIndex : true;
                              const isActive = activeJob ? index === activeJobIndex : false;

                              return (
                                <div 
                                  key={step.label} 
                                  className={`step-node ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                                >
                                  <div className="step-dot">
                                    {isCompleted ? '✓' : index + 1}
                                  </div>
                                  <div className="step-label">{step.label}</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Terminal Output */}
                          <div className="terminal-window">
                            <div className="terminal-title">
                              <TerminalIcon size={12} /> 
                              automation-engine-worker-v1.0.0.log
                            </div>
                            
                            {(activeJob?.logs || selectedLead?.logs || []).map((line, idx) => (
                              <div key={idx} className="terminal-line">{line}</div>
                            ))}
                            
                            {activeJob && activeJob.status !== 'COMPLETED' && activeJob.status !== 'FAILED' && (
                              <div className="terminal-line" style={{color: '#a5b4fc'}}>
                                █ Pipeline execution active... awaiting worker ticks
                              </div>
                            )}

                            <div ref={terminalEndRef} />
                          </div>
                        </div>
                      )}

                      {/* TAB 2: AUDIT METRICS REPORT */}
                      {activeDetailTab === 'report' && selectedLead?.auditData && (
                        <div className="report-panel animate-fade-in">
                          <div className="report-grid">
                            
                            {/* Score Row */}
                            <div className="report-score-row">
                              {/* circular score badge */}
                              {(() => {
                                const score = selectedLead.auditData.digitalPresence.seoScore || 75;
                                let color = 'var(--success)';
                                if (score < 50) color = 'var(--danger)';
                                else if (score < 80) color = 'var(--warning)';

                                return (
                                  <div 
                                    className="gauge-circle" 
                                    style={{
                                      background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                                    }}
                                  >
                                    <div className="gauge-inner">
                                      <span className="gauge-number" style={{color}}>{score}%</span>
                                      <span className="gauge-label">SEO SCORE</span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* SEO Analysis Text */}
                              <div className="audit-card" style={{flex: 1, border: 'none', background: 'transparent', padding: 0}}>
                                <h4>Website & SEO Diagnosis</h4>
                                <p>{selectedLead.auditData.digitalPresence.seoAudit}</p>
                              </div>
                            </div>

                            {/* Executive Summary */}
                            <div className="audit-card">
                              <h4>Executive Summary</h4>
                              <p>{selectedLead.auditData.executiveSummary}</p>
                            </div>

                            {/* Website UX & Branding */}
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                              <div className="audit-card">
                                <h4>User Experience Audit</h4>
                                <p>{selectedLead.auditData.digitalPresence.websiteUX}</p>
                              </div>
                              <div className="audit-card">
                                <h4>Brand Voice & Positioning</h4>
                                <p>{selectedLead.auditData.digitalPresence.messaging}</p>
                              </div>
                            </div>

                            {/* SWOT Quadrants grid */}
                            <div className="swot-grid">
                              <div className="swot-card strengths">
                                <h5>STRENGTHS</h5>
                                <ul className="swot-list">
                                  {selectedLead.auditData.swot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                              
                              <div className="swot-card weaknesses">
                                <h5>WEAKNESSES</h5>
                                <ul className="swot-list">
                                  {selectedLead.auditData.swot.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                              </div>

                              <div className="swot-card opportunities">
                                <h5>OPPORTUNITIES</h5>
                                <ul className="swot-list">
                                  {selectedLead.auditData.swot.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                                </ul>
                              </div>

                              <div className="swot-card threats">
                                <h5>THREATS</h5>
                                <ul className="swot-list">
                                  {selectedLead.auditData.swot.threats.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                              </div>
                            </div>

                            {/* Timeline Strategic Roadmap */}
                            <div className="audit-card">
                              <h4 style={{marginBottom: '1.25rem'}}><TrendingUp size={16} /> Actionable Growth Roadmap</h4>
                              
                              <div className="roadmap-timeline">
                                <div className="roadmap-step">
                                  <div>
                                    <span className="roadmap-marker phase1">Quick Wins (Wk 1)</span>
                                  </div>
                                  <ul className="roadmap-bullets">
                                    {selectedLead.auditData.growthStrategy.roadmap.phase1QuickWins.map((w, i) => (
                                      <li key={i}><CheckCircle size={14} style={{color: 'var(--success)'}} /> {w}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="roadmap-step">
                                  <div>
                                    <span className="roadmap-marker phase2">Medium-Term (Mo 1-3)</span>
                                  </div>
                                  <ul className="roadmap-bullets">
                                    {selectedLead.auditData.growthStrategy.roadmap.phase2MediumTerm.map((m, i) => (
                                      <li key={i}><Sparkles size={14} style={{color: 'var(--warning)'}} /> {m}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="roadmap-step">
                                  <div>
                                    <span className="roadmap-marker phase3">Strategic (Mo 3-6)</span>
                                  </div>
                                  <ul className="roadmap-bullets">
                                    {selectedLead.auditData.growthStrategy.roadmap.phase3Strategic.map((s, i) => (
                                      <li key={i}><Layers size={14} style={{color: '#818cf8'}} /> {s}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* TAB 3: OUTREACH EMAIL PITCH PREVIEW */}
                      {activeDetailTab === 'email' && selectedLead?.auditData && (
                        <div className="email-panel animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                              The following hyper-personalized cold outreach email was generated using our scraped audits and operational insights:
                            </p>
                            <button 
                              className="action-btn"
                              onClick={() => copyToClipboard(selectedLead.auditData.outreachEmail.body, 'Email body')}
                            >
                              <Copy size={14} /> Copy Body
                            </button>
                          </div>

                          <div className="email-mockup">
                            <div className="email-meta">
                              <div className="email-meta-row">
                                <span className="email-meta-label">To:</span>
                                <span className="email-meta-val">{selectedLead.leadInfo.name} &lt;{selectedLead.leadInfo.email}&gt;</span>
                              </div>
                              <div className="email-meta-row">
                                <span className="email-meta-label">Subject:</span>
                                <span className="email-meta-val email-meta-subject">{selectedLead.auditData.outreachEmail.subject}</span>
                              </div>
                              <div className="email-meta-row">
                                <span className="email-meta-label">Attachment:</span>
                                <span className="email-meta-val" style={{color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                                  <FileText size={12} /> {selectedLead.leadInfo.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Digital_Audit.pdf
                                </span>
                              </div>
                            </div>
                            <div className="email-body">
                              {selectedLead.auditData.outreachEmail.body}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="empty-state" style={{margin: 'auto'}}>
                    <Database size={48} style={{color: 'var(--text-muted)'}} />
                    <h3>No Lead Selected</h3>
                    <p>Select a company profile from the submissions list on the left to review metrics, logs, SWOT diagnostics, and personalized copy.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
         CLOUD CREDENTIALS DYNAMIC DRAWER
         ========================================== */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="settings-hdr">
              <h3><Settings size={20} style={{color: '#818cf8'}} /> Cloud API Credentials</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <Plus size={20} style={{transform: 'rotate(45deg)'}} />
              </button>
            </div>

            <form className="settings-body" onSubmit={handleSaveSettings}>
              {/* AI Section */}
              <div className="settings-section-title" style={{display: 'flex', alignItems: 'center'}}>
                <span>AI Processing Models</span>
              </div>
              
              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>Gemini API Key</span>
                  <span className={`api-status-badge ${config.hasGemini ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasGemini ? 'Active' : 'Unconfigured'}
                  </span>
                </label>
                <input 
                  type="password" 
                  name="GEMINI_API_KEY" 
                  className="form-input" 
                  placeholder={config.hasGemini ? '••••••••••••••••••••••••' : 'Enter Gemini Key'}
                  value={settingsForm.GEMINI_API_KEY}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>OpenAI API Key</span>
                  <span className={`api-status-badge ${config.hasOpenAI ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasOpenAI ? 'Active' : 'Unconfigured'}
                  </span>
                </label>
                <input 
                  type="password" 
                  name="OPENAI_API_KEY" 
                  className="form-input" 
                  placeholder={config.hasOpenAI ? '••••••••••••••••••••••••' : 'Enter OpenAI Key'}
                  value={settingsForm.OPENAI_API_KEY}
                  onChange={handleSettingsChange}
                />
              </div>

              {/* Email Section */}
              <div className="settings-section-title">Email Outreach Service</div>
              
              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>Resend API Key</span>
                  <span className={`api-status-badge ${config.hasResend ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasResend ? 'Active' : 'Unconfigured'}
                  </span>
                </label>
                <input 
                  type="password" 
                  name="RESEND_API_KEY" 
                  className="form-input" 
                  placeholder={config.hasResend ? '••••••••••••••••••••••••' : 'Enter Resend API Key'}
                  value={settingsForm.RESEND_API_KEY}
                  onChange={handleSettingsChange}
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem'}}>
                <div className="form-group">
                  <label>SMTP Server Host</label>
                  <input 
                    type="text" 
                    name="SMTP_HOST" 
                    className="form-input" 
                    placeholder="e.g. smtp.gmail.com"
                    value={settingsForm.SMTP_HOST}
                    onChange={handleSettingsChange}
                  />
                </div>
                <div className="form-group">
                  <label>SMTP Port</label>
                  <input 
                    type="text" 
                    name="SMTP_PORT" 
                    className="form-input" 
                    placeholder="587"
                    value={settingsForm.SMTP_PORT}
                    onChange={handleSettingsChange}
                  />
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                <div className="form-group">
                  <label>SMTP Username</label>
                  <input 
                    type="text" 
                    name="SMTP_USER" 
                    className="form-input" 
                    placeholder="User account"
                    value={settingsForm.SMTP_USER}
                    onChange={handleSettingsChange}
                  />
                </div>
                <div className="form-group">
                  <label>SMTP Password</label>
                  <input 
                    type="password" 
                    name="SMTP_PASS" 
                    className="form-input" 
                    placeholder="Key / Password"
                    value={settingsForm.SMTP_PASS}
                    onChange={handleSettingsChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Outbound "From" Header</label>
                <input 
                  type="text" 
                  name="SMTP_FROM" 
                  className="form-input" 
                  value={settingsForm.SMTP_FROM}
                  onChange={handleSettingsChange}
                />
              </div>

              {/* Database Section */}
              <div className="settings-section-title">Database</div>

              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>Neon PostgreSQL DATABASE_URL</span>
                  <span className={`api-status-badge ${config.hasDatabase ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasDatabase ? config.databaseMode : 'Local JSON'}
                  </span>
                </label>
                <input
                  type="password"
                  name="DATABASE_URL"
                  className="form-input"
                  placeholder={config.hasDatabase ? 'postgresql://...' : 'Paste Neon connection string'}
                  value={settingsForm.DATABASE_URL}
                  onChange={handleSettingsChange}
                />
              </div>

              {/* Google API Section */}
              <div className="settings-section-title">Google APIs integration (Bonus)</div>
              
              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>Service Account JSON String</span>
                  <span className={`api-status-badge ${config.hasGoogleAuth ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasGoogleAuth ? 'Active' : 'Unconfigured'}
                  </span>
                </label>
                <textarea 
                  name="GOOGLE_SERVICE_ACCOUNT_JSON" 
                  className="form-input" 
                  style={{resize: 'vertical', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.75rem'}}
                  placeholder={config.hasGoogleAuth ? '{"type": "service_account", ...}' : 'Paste Service Account credentials.json contents'}
                  value={settingsForm.GOOGLE_SERVICE_ACCOUNT_JSON}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>Google Sheets Tracker ID</span>
                  <span className={`api-status-badge ${config.hasGoogleSheets ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasGoogleSheets ? 'Active' : 'Unconfigured'}
                  </span>
                </label>
                <input 
                  type="text" 
                  name="GOOGLE_SHEETS_ID" 
                  className="form-input" 
                  placeholder="Enter Spreadsheet ID"
                  value={settingsForm.GOOGLE_SHEETS_ID}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="form-group">
                <label style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <span>Google Drive Folder ID</span>
                  <span className={`api-status-badge ${config.hasGoogleDrive ? 'active' : 'inactive'}`}>
                    <span className="status-dot"></span> {config.hasGoogleDrive ? 'Active' : 'Unconfigured'}
                  </span>
                </label>
                <input 
                  type="text" 
                  name="GOOGLE_DRIVE_FOLDER_ID" 
                  className="form-input" 
                  placeholder="Enter Target Folder ID"
                  value={settingsForm.GOOGLE_DRIVE_FOLDER_ID}
                  onChange={handleSettingsChange}
                />
              </div>

              <div className="settings-ftr">
                <button type="button" className="action-btn" onClick={() => setShowSettings(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
