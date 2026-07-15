import React, { useState, useEffect } from 'react';
import { Upload, Check, ArrowUp, MessageCircle, ArrowRight } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from './Footer';
import logo from "../images/logo-1.png";
import API_BASE_URL from "./apiConfig";
import './LandingPage.css';

export default function LandingPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    requirementType: '',
    file: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('.land-page-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('land-page-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 980) setMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const handleWhatsAppClick = () => window.open('https://wa.me/919019303569', '_blank');
  const scrollToId = (id) => (e) => {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim() || !formData.requirementType) {
      toast.error('Please fill in all required fields!', { position: "top-right", autoClose: 5000 });
      return;
    }

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number!', { position: "top-right", autoClose: 5000 });
      return;
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('Please enter a valid email address!', { position: "top-right", autoClose: 5000 });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('requirementType', formData.requirementType);
      if (formData.file) formDataToSend.append('file', formData.file);

      const response = await fetch(`${API_BASE_URL}/api/quote-request`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Quote request submitted successfully! Request ID: ${data.data.quoteId}. We will contact you soon.`, { position: "top-right", autoClose: 7000 });
        setFormData({ name: '', phone: '', email: '', requirementType: '', file: null });
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(data.message || 'Failed to submit quote request. Please try again.', { position: "top-right", autoClose: 5000 });
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
      toast.error('Network error. Please check your connection and try again.', { position: "top-right", autoClose: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const solutions = [
    { title: 'Industrial Workflow Models', desc: 'Factory layouts, assembly lines, automation cells and material flow systems built to precise plant scale.', tags: ['Factory Layouts', 'Automation Cells'] },
    { title: 'Mechanical Miniatures', desc: 'Engine cutaways, gearboxes, EV battery models, machine assemblies and suspension systems.', tags: ['Engine Cutaways', 'EV Battery Models'] },
    { title: 'Architectural Scale Models', desc: 'Residential projects, commercial buildings, townships, master plans and interior layouts.', tags: ['Townships', 'Master Plans'] },
    { title: 'Product Prototypes', desc: 'Functional prototypes, investor demonstration models, product mockups and concept validation.', tags: ['Functional Protos', 'Investor Models'] },
    { title: 'Custom Engineering Projects', desc: 'Museum displays, exhibition models, educational kits and scientific demonstration pieces.', tags: ['Museum Displays', 'Educational Kits'] },
    { title: 'Production & Batch Manufacturing', desc: 'One-off custom parts, small production batches, tooling, jigs and fixtures, and repeat runs.', tags: ['Jigs & Fixtures', 'Batch Runs'] },
  ];

  const whyItems = [
    { num: '01', title: 'Communicate Complex Ideas', desc: 'Turn dense CAD and drawings into something anyone in the room can read in seconds.' },
    { num: '02', title: 'Improve Technical Training', desc: 'Cutaways and working assemblies teach mechanisms faster than any diagram.' },
    { num: '03', title: 'Support Product Development', desc: 'Catch ergonomic and fit issues early, before tooling costs are committed.' },
    { num: '04', title: 'Win More Business', desc: 'A model on the table closes conversations that a slide deck leaves open.' },
    { num: '05', title: 'Factory Planning', desc: 'Test layout and flow changes on a desk before moving a single machine.' },
    { num: '06', title: 'Trade Shows & Exhibitions', desc: 'Give visitors something to walk around, not just a screen to glance at.' },
    { num: '07', title: 'Investor Demonstrations', desc: 'Tangible proof of concept builds confidence faster than projections alone.' },
    { num: '08', title: 'Engineering Validation', desc: 'Verify assembly, tolerance and fit at scale before committing to production.' },
  ];

  const industries = [
    { name: 'Automotive', desc: 'Powertrain and body-in-white models' },
    { name: 'Manufacturing', desc: 'Plant layouts and process cells' },
    { name: 'Architecture', desc: 'Massing, township and interior models' },
    { name: 'Engineering', desc: 'Mechanism and assembly validation' },
    { name: 'Education', desc: 'Teaching models and demo kits' },
    { name: 'Medical', desc: 'Anatomical and device models' },
    { name: 'Research', desc: 'Experimental rigs and fixtures' },
    { name: 'Robotics', desc: 'Arm, chassis and gripper mockups' },
  ];

  const processSteps = [
    { n: '01', title: 'Share Requirement', desc: 'Send drawings, references or a rough brief.' },
    { n: '02', title: 'Engineering Consultation', desc: 'We scope scale, material and tolerances.' },
    { n: '03', title: 'Design Review', desc: 'Digital review before anything is built.' },
    { n: '04', title: 'Quotation', desc: 'Transparent pricing and timeline.' },
    { n: '05', title: 'Manufacturing', desc: 'Precision printing and machining.' },
    { n: '06', title: 'Post-Processing', desc: 'Finishing, painting and assembly.' },
    { n: '07', title: 'Quality Inspection', desc: 'Dimensional and visual QC.' },
    { n: '08', title: 'Packaging', desc: 'Custom protective packaging.' },
    { n: '09', title: 'Delivery', desc: 'Pan-India, tracked and insured.' },
  ];

  const stats = [
    { n: '1,200+', l: 'Projects Delivered' },
    { n: '48,000+', l: 'Hours Printed' },
    { n: '14', l: 'Industries Served' },
    { n: '60+', l: 'Cities Delivered To' },
  ];

  const testimonials = [
    { quote: 'The tolerances on our gearbox cutaway were exact enough to use in technical training, not just for show.', who: 'Head of Engineering', org: 'Auto Component Manufacturer' },
    { quote: 'Our township model closed a client decision that had been stuck for three months of renders.', who: 'Design Director', org: 'Architecture Studio' },
    { quote: 'We moved from single prototype to an 800-piece pilot batch without changing vendors. That continuity mattered.', who: 'Product Manager', org: 'Industrial Equipment Company' },
  ];

  const scrollTopButtonStyle = {
    position: 'fixed', bottom: '100px', right: '30px', width: '50px', height: '50px',
    borderRadius: '50%', backgroundColor: '#2563eb', color: 'white', border: 'none',
    cursor: 'pointer', display: showScrollTop ? 'flex' : 'none', alignItems: 'center',
    justifyContent: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.4)', zIndex: 1000,
    transition: 'all 0.3s ease', outline: 'none'
  };

  const whatsappButtonStyle = {
    position: 'fixed', bottom: '30px', right: '25px', width: '60px', height: '60px',
    borderRadius: '50%', backgroundColor: '#25D366', color: 'white', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)', zIndex: 1000, transition: 'all 0.3s ease',
    outline: 'none', animation: 'landPageWhatsappPulse 2s infinite'
  };

  return (
    <div className="land-page-root">
      {/* NAV */}
      <header id="land-page-header" className={`land-page-header ${scrolled ? 'land-page-header-scrolled' : ''}`}>
        <div className="land-page-nav-row">
          <a className="land-page-logo" href="#land-page-top">
            <img src={logo} alt="Dimensify3D Logo" className="land-page-logo-img" />
            <div>
              <div className="land-page-brand-text">Dimensify3D</div>
              <div className="land-page-brand-sub">3D Printing Solutions</div>
            </div>
          </a>
          <nav className="land-page-nav-links">
            <a href="#land-page-solutions" onClick={scrollToId('land-page-solutions')}>Solutions</a>
            <a href="#land-page-industries" onClick={scrollToId('land-page-industries')}>Industries</a>
            <a href="#land-page-process" onClick={scrollToId('land-page-process')}>Process</a>
            <a href="#land-page-why" onClick={scrollToId('land-page-why')}>Why Models</a>
            <a href="#land-page-testimonials" onClick={scrollToId('land-page-testimonials')}>Case Studies</a>
          </nav>
          <div className="land-page-nav-cta">
            <a href="#land-page-quote" onClick={scrollToId('land-page-quote')} className="land-page-btn land-page-btn-primary">Request a Quote</a>
          </div>
          <button
            className={`land-page-burger ${menuOpen ? 'land-page-burger-open' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <div className={`land-page-mobile-nav ${menuOpen ? 'land-page-mobile-nav-open' : ''}`}>
          <a href="#land-page-solutions" onClick={scrollToId('land-page-solutions')}>Solutions</a>
          <a href="#land-page-industries" onClick={scrollToId('land-page-industries')}>Industries</a>
          <a href="#land-page-process" onClick={scrollToId('land-page-process')}>Process</a>
          <a href="#land-page-why" onClick={scrollToId('land-page-why')}>Why Models</a>
          <a href="#land-page-testimonials" onClick={scrollToId('land-page-testimonials')}>Case Studies</a>
          <a href="#land-page-quote" onClick={scrollToId('land-page-quote')} className="land-page-btn land-page-btn-primary land-page-mobile-cta">Request a Quote</a>
        </div>
      </header>

      <main id="land-page-top">
        {/* HERO */}
        <section className="land-page-hero">
          <div className="land-page-blueprint"></div>
          <div className="land-page-container land-page-hero-grid">
            <div className="land-page-reveal">
              <span className="land-page-eyebrow">Engineering &amp; Rapid Manufacturing</span>
              <h1 className="land-page-hero-title">Engineering Ideas.<br /><em>Built to Scale.</em></h1>
              <p className="land-page-hero-lead">
                We design and manufacture industrial scale models, mechanical miniatures,
                architectural models, functional prototypes, exhibition displays, and custom
                manufacturing solutions for businesses across India.
              </p>
              <div className="land-page-hero-actions">
                <a href="#land-page-quote" onClick={scrollToId('land-page-quote')} className="land-page-btn land-page-btn-primary">
                  Request a Quote <ArrowRight size={16} />
                </a>
                <a href="#land-page-solutions" onClick={scrollToId('land-page-solutions')} className="land-page-btn land-page-btn-ghost">
                  Explore Our Work
                </a>
              </div>
              <div className="land-page-trust-strip">
                <div className="land-page-trust-item"><Check size={16} /> Industrial Engineering Models</div>
                <div className="land-page-trust-item"><Check size={16} /> Rapid Prototyping</div>
                <div className="land-page-trust-item"><Check size={16} /> Bulk Manufacturing</div>
                <div className="land-page-trust-item"><Check size={16} /> Pan-India Delivery</div>
              </div>
            </div>

            <div className="land-page-hero-visual land-page-reveal">
              <svg viewBox="0 0 460 460" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <g className="land-page-floaty">
                  <path d="M230 40 L400 130 V320 L230 410 L60 320 V130 Z" fill="none" stroke="#E7E9ED" strokeWidth="1.5" />
                  <path d="M230 40 L230 225 L400 130 Z" fill="#2AA9E0" opacity="0.92" />
                  <path d="M230 225 L230 410 L400 320 V130 Z" fill="#16305C" />
                  <path d="M230 40 L230 225 L60 130 Z" fill="#5EC3EE" opacity="0.85" />
                  <g stroke="#2563EB" strokeWidth="1" opacity="0.55">
                    <line x1="60" y1="130" x2="20" y2="150" />
                    <line x1="400" y1="130" x2="440" y2="150" />
                  </g>
                  <g fontFamily="monospace" fontSize="11" fill="#2563EB">
                    <text x="0" y="165">184.2mm</text>
                    <text x="405" y="165">SCALE 1:20</text>
                  </g>
                  <circle cx="230" cy="40" r="3" fill="#2563EB" />
                  <circle cx="60" cy="130" r="3" fill="#2563EB" />
                  <circle cx="400" cy="130" r="3" fill="#2563EB" />
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="land-page-marquee-strip">
          <div className="land-page-marquee">
            {['Automotive', 'Manufacturing', 'Architecture', 'Engineering', 'Education', 'Medical', 'Research', 'Robotics',
              'Automotive', 'Manufacturing', 'Architecture', 'Engineering', 'Education', 'Medical', 'Research', 'Robotics'].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>

        {/* SOLUTIONS */}
        <section className="land-page-pad" id="land-page-solutions">
          <div className="land-page-container">
            <div className="land-page-sec-head land-page-reveal">
              <span className="land-page-eyebrow">Capabilities</span>
              <h2>What can we build for you?</h2>
              <p>Six disciplines, one engineering process — from a single validation piece to production-scale runs.</p>
            </div>

            <div className="land-page-sol-grid">
              {solutions.map((s, i) => (
                <div className="land-page-sol-card land-page-reveal" key={i}>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <div className="land-page-sol-tags">
                    {s.tags.map((t, idx) => <span key={idx}>{t}</span>)}
                  </div>
                  <a href="#land-page-quote" onClick={scrollToId('land-page-quote')} className="land-page-sol-link">
                    Learn more <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>

            <div className="land-page-badge-run land-page-reveal"><span className="land-page-dot"></span> From 1 piece to large production runs</div>
          </div>
        </section>

        {/* WHY MODELS MATTER */}
        <section className="land-page-pad land-page-why-bg" id="land-page-why">
          <div className="land-page-container">
            <div className="land-page-sec-head land-page-reveal">
              <span className="land-page-eyebrow land-page-eyebrow-light">The Case For Physical</span>
              <h2>Why physical models matter</h2>
              <p>A rendering asks people to imagine. A physical model lets them decide — faster approvals, fewer revisions, clearer conversations.</p>
            </div>
            <div className="land-page-compare-grid">
              {whyItems.map((w, i) => (
                <div className="land-page-compare-card land-page-reveal" key={i}>
                  <div className="land-page-compare-num">{w.num}</div>
                  <h4>{w.title}</h4>
                  <p>{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INDUSTRIES */}
        <section className="land-page-pad-tight" id="land-page-industries">
          <div className="land-page-container">
            <div className="land-page-sec-head land-page-reveal">
              <span className="land-page-eyebrow">Industries We Serve</span>
              <h2>Built for how your industry works</h2>
            </div>
            <div className="land-page-ind-grid">
              {industries.map((ind, i) => (
                <div className="land-page-ind-card land-page-reveal" key={i}>
                  <h4>{ind.name}</h4>
                  <p>{ind.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="land-page-pad" id="land-page-process">
          <div className="land-page-container">
            <div className="land-page-sec-head land-page-reveal">
              <span className="land-page-eyebrow">Our Process</span>
              <h2>From your brief to your dock</h2>
            </div>
            <div className="land-page-timeline">
              {processSteps.map((step, i) => (
                <div className="land-page-tl-step land-page-reveal" key={i}>
                  <div className="land-page-tl-dot">{step.n}</div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="land-page-sec-head land-page-reveal" style={{ marginTop: '56px' }}>
              <span className="land-page-eyebrow">Scales With You</span>
              <h2>From prototype to production</h2>
              <p>Whether you need one proof of concept or thousands of production parts, our workflow scales with your business.</p>
            </div>
            <div className="land-page-flow-strip land-page-reveal">
              <div className="land-page-flow-node land-page-on">Idea</div><span className="land-page-flow-arrow">→</span>
              <div className="land-page-flow-node">Prototype</div><span className="land-page-flow-arrow">→</span>
              <div className="land-page-flow-node">Validation</div><span className="land-page-flow-arrow">→</span>
              <div className="land-page-flow-node">Pilot Batch</div><span className="land-page-flow-arrow">→</span>
              <div className="land-page-flow-node">Production</div><span className="land-page-flow-arrow">→</span>
              <div className="land-page-flow-node land-page-on">Bulk Manufacturing</div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="land-page-pad-tight">
          <div className="land-page-container">
            <div className="land-page-stats-grid">
              {stats.map((s, i) => (
                <div className="land-page-stat land-page-reveal" key={i}>
                  <div className="land-page-stat-n">{s.n}</div>
                  <div className="land-page-stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="land-page-pad-tight" id="land-page-testimonials">
          <div className="land-page-container">
            <div className="land-page-sec-head land-page-reveal">
              <span className="land-page-eyebrow">Client Trust</span>
              <h2>Engineering teams rely on us</h2>
            </div>
            <div className="land-page-test-grid">
              {testimonials.map((t, i) => (
                <div className="land-page-test-card land-page-reveal" key={i}>
                  <div className="land-page-stars">★★★★★</div>
                  <p>{t.quote}</p>
                  <div className="land-page-test-who">
                    <div className="land-page-test-avatar"></div>
                    <div>
                      <h5>{t.who}</h5>
                      <span>{t.org}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUOTE FORM */}
        <section className="land-page-pad" id="land-page-quote">
          <div className="land-page-container">
            <div className="land-page-contact-wrap land-page-reveal">
              <div className="land-page-contact-left">
                <span className="land-page-eyebrow land-page-eyebrow-light">Start A Project</span>
                <h2>Get Your Custom Quote</h2>
                <p>Tell us what you're trying to build. An engineer, not a salesperson, will review your brief and get back to you.</p>
                <ul className="land-page-contact-points">
                  <li><Check size={16} /> Dedicated project consultation</li>
                  <li><Check size={16} /> Confidential handling, NDA supported</li>
                  <li><Check size={16} /> Quotes typically within 48 hours</li>
                  <li><Check size={16} /> Nationwide, tracked delivery</li>
                </ul>
              </div>

              <div className="land-page-contact-right">
                <form onSubmit={handleSubmit}>
                  <div className="land-page-field">
                    <label className="land-page-required-field">Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter Your Name"
                      disabled={isSubmitting}
                      className="land-page-input"
                    />
                  </div>

                  <div className="land-page-field">
                    <label className="land-page-required-field">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter Your Phone Number"
                      disabled={isSubmitting}
                      className="land-page-input"
                    />
                  </div>

                  <div className="land-page-field">
                    <label className="land-page-optional-field">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter Your Email (Optional)"
                      disabled={isSubmitting}
                      className="land-page-input"
                    />
                  </div>

                  <div className="land-page-field">
                    <label className="land-page-required-field">Requirement Type</label>
                    <select
                      name="requirementType"
                      required
                      value={formData.requirementType}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="land-page-input"
                    >
                      <option value="">Select type</option>
                      <option value="prototype">Prototype</option>
                      <option value="machine-part">Machine Part</option>
                      <option value="model">Model</option>
                      <option value="workflow-design">Workflow Design</option>
                    </select>
                  </div>

                  <div className="land-page-field">
                    <label className="land-page-optional-field">Upload Design (Optional)</label>
                    <div className="land-page-file-upload-area">
                      <Upload size={26} />
                      <p>STL, OBJ, STEP, IGES, DWG, PDF, PNG, JPG up to 10MB</p>

                      {formData.file && (
                        <p className="land-page-file-selected">
                          <Check size={16} /> Selected: {formData.file.name}
                        </p>
                      )}

                      <input
                        type="file"
                        name="file"
                        onChange={handleChange}
                        className="land-page-hidden-input"
                        accept=".stl,.obj,.step,.stp,.iges,.igs,.dwg,.pdf,.png,.jpg,.jpeg"
                        id="file-upload"
                        disabled={isSubmitting}
                      />
                      <label htmlFor="file-upload" className={`land-page-btn land-page-btn-light ${isSubmitting ? 'land-page-disabled' : ''}`}>
                        Choose File
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="land-page-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="land-page-spinner" /> Submitting...
                      </>
                    ) : (
                      'Get Quote Now'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <button
        onClick={scrollToTop}
        style={scrollTopButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = '#1e40af';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = '#2563eb';
        }}
        aria-label="Scroll to top"
      >
        <ArrowUp size={24} />
      </button>

      <button
        onClick={handleWhatsAppClick}
        style={whatsappButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = '#128C7E';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = '#25D366';
        }}
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle size={28} />
      </button>

      <ToastContainer />
    </div>
  );
}