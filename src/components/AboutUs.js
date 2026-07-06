import React, { useState, useEffect } from "react";
import {
  Box,
  Layers,
  Pencil,
  Award,
  DollarSign,
  Sparkles,
  Users,
  Target,
  Zap,
  Rocket,
  GraduationCap,
  Landmark,
  Smartphone,
  Cpu,
  Wrench,
  Globe,
  FlaskConical,
  CheckCircle2,
  Code2,
  Megaphone,
  Calculator,
  Quote,
  Factory,
  Cog,
  Building2,
  TestTube2,
} from "lucide-react";
import Footer from "./Footer";
import adil from "../images/adil-1.jpeg";

export default function AboutUs() {
  const [isVisible, setIsVisible] = useState({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState([]);
  const [secretCode, setSecretCode] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Secret code sequence (can be changed as needed)
  const targetCode = "admin";

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".animate-on-scroll").forEach((el) => {
      observer.observe(el);
    });

    // Generate particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 15 + Math.random() * 10,
    }));
    setParticles(newParticles);

    // Secret code listener
    const handleKeyPress = (e) => {
      const newCode = secretCode + e.key.toLowerCase();
      setSecretCode(newCode);

      // Reset if code gets too long
      if (newCode.length > targetCode.length) {
        setSecretCode(e.key.toLowerCase());
      }

      // Check if secret code matches
      if (newCode === targetCode) {
        setShowAdminLogin(true);
        setSecretCode("");
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("resize", checkMobile);
    };
  }, [secretCode]);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    setMousePosition({ x: clientX, y: clientY });
  };

  const handleAdminLogin = () => {
    // Redirect to admin login page
    window.location.href = "/adminlogin";
  };

  const services = [
    {
      icon: <Factory size={40} />,
      title: "Industrial Workflows",
      description:
        "Factory layouts, manufacturing flow visualization, and precise conveyor systems.",
      color: "#2a65c5",
    },
    {
      icon: <Cog size={40} />,
      title: "Mechanical Miniatures",
      description:
        "Machinery replicas, equipment mockups, and interactive assembly demonstrations.",
      color: "#0a50b1",
    },
    {
      icon: <Building2 size={40} />,
      title: "Architectural Models",
      description:
        "Detailed buildings, campus layouts, and highly accurate smart city concepts.",
      color: "#1e5db8",
    },
    {
      icon: <Wrench size={40} />,
      title: "Custom Project & Bespoke Manufacturing",
      description:
        "Functional parts, and personalized products built to your exact specifications.",
      color: "#2a65c5",
    },
    {
      icon: <TestTube2 size={40} />,
      title: "Product Prototyping",
      description:
        "Transform your ideas into functional, high-precision prototypes with professional SLA 3D printing. Ideal for product development, testing and design validation.",
      color: "#0a50b1",
    },
  ];

  const features = [
    {
      icon: <Award size={32} />,
      title: "Quality & Precision",
      description:
        "Every print meets high standards of accuracy and durability.",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      icon: <DollarSign size={32} />,
      title: "Affordability",
      description:
        "We make 3D printing accessible without compromising on quality.",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      icon: <Sparkles size={32} />,
      title: "Customization",
      description:
        "Your imagination is the limit for unique designs and personal touches.",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
    {
      icon: <Users size={32} />,
      title: "Expertise",
      description: "Strong CAD knowledge to help design smarter solutions.",
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    },
    {
      icon: <Target size={32} />,
      title: "Nationwide Reach",
      description: "Our services are just a click away, anywhere in India.",
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    },
  ];

  // Founder details
  const expertise = [
    {
      icon: <GraduationCap size={20} />,
      text: "Mechanical Engineer with expertise in product design, automation, and software development.",
    },
    {
      icon: <GraduationCap size={20} />,
      text: "Currently pursuing M.Tech, expanding my knowledge in advanced engineering and research.",
    },
    {
      icon: <Landmark size={20} />,
      text: "Research Intern at IIT Dharwad, working on engineering research and innovative technology projects.",
    },
    {
      icon: <Smartphone size={20} />,
      text: "Mobile Application Developer creating intuitive and user-friendly Android applications.",
    },
    {
      icon: <Cpu size={20} />,
      text: "IoT & Embedded Systems Developer with experience in ESP8266, sensors, Firebase, and real-time monitoring.",
    },
    {
      icon: <Wrench size={20} />,
      text: "Mechanical Design Engineer skilled in CAD modeling, product development, and 3D printing.",
    },
    {
      icon: <Globe size={20} />,
      text: "Developed custom websites and software solutions for businesses, institutions, and startups.",
    },
    {
      icon: <FlaskConical size={20} />,
      text: "Designed multiple engineering prototypes integrating hardware and software technologies.",
    },
    {
      icon: <Rocket size={20} />,
      text: "Passionate about solving real-world problems through innovation, engineering, and technology.",
    },
  ];

  const notableProjects = [
    "Smart Saline Level Monitoring System",
    "Dynamic Online Examination Platform",
    "Automatic Car Covering System",
    "Smart Dust Cleaner Automation System",
    "Industrial Mechanical Workflow Processes Using 3D Printing",
    "Custom Business Websites & Web Applications",
    "IoT-Based Monitoring & Automation Solutions",
  ];

  const approach = [
    "Understand the client's vision",
    "Design practical and scalable solutions",
    "Develop with quality and precision",
    "Deliver on time with complete support",
    "Build long-term relationships based on trust",
  ];

  // Team details (no photos)
  const team = [
    {
      initials: "KP",
      name: "Kartik Pandey",
      role: "Team Lead · Full-Stack Developer",
      description:
        "Experienced in building modern web & mobile applications, admin dashboards, APIs, and database-driven systems.",
      icon: <Code2 size={26} />,
      gradient: "linear-gradient(135deg, #2a65c5 0%, #0a50b1 100%)",
    },
    {
      initials: "SB",
      name: "Sohail Bisti",
      role: "Marketing Head",
      description:
        "Leads marketing efforts and manages social media presence across all platforms.",
      icon: <Megaphone size={26} />,
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      initials: "P",
      name: "Pavan",
      role: "Accountant",
      description:
        "Manages financial records and keeps the books accurate and up to date.",
      icon: <Calculator size={26} />,
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    },
  ];

  return (
    <div style={styles.wrapper} onMouseMove={handleMouseMove}>
      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div style={styles.adminModalOverlay}>
          <div style={styles.adminModal} className="admin-modal">
            <div style={styles.adminModalContent}>
              <h3 style={styles.adminModalTitle}>Admin Access</h3>
              <p style={styles.adminModalText}>
                Secret code accepted! You now have access to the admin panel.
              </p>
              <div style={styles.adminModalButtons}>
                <button
                  style={styles.adminButtonPrimary}
                  onClick={handleAdminLogin}
                >
                  Go to Admin Login
                </button>
                <button
                  style={styles.adminButtonSecondary}
                  onClick={() => setShowAdminLogin(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Particles */}
      <section style={styles.hero}>
        {/* Animated Background Particles */}
        {!isMobile &&
          particles.map((particle) => (
            <div
              key={particle.id}
              className="particle"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
              }}
            />
          ))}

        {/* Floating Shapes */}
        {!isMobile && (
          <>
            <div
              className="floating-shape shape-1"
              style={styles.floatingShape1}
            ></div>
            <div
              className="floating-shape shape-2"
              style={styles.floatingShape2}
            ></div>
            <div
              className="floating-shape shape-3"
              style={styles.floatingShape3}
            ></div>
          </>
        )}

        <div style={styles.container}>
          <div
            style={styles.heroContent}
            className="animate-on-scroll hero-content"
            id="hero"
          >
            <div className="glitch-wrapper">
              <h1
                style={styles.heroTitle}
                className={isMobile ? "" : "glitch"}
                data-text="About Dimensify3D"
              >
                About Dimensify3D
              </h1>
            </div>
            <p style={styles.heroSubtitle} className="fade-in-up">
              Transforming Ideas into Reality Through Innovation and Precision
            </p>
            <div style={styles.heroDivider} className="expand-line"></div>
            <div style={styles.heroIcons}>
              <div
                className={isMobile ? "" : "pulse-icon"}
                style={styles.heroIcon}
              >
                <Rocket size={32} />
              </div>
              <div
                className={isMobile ? "" : "pulse-icon"}
                style={{ ...styles.heroIcon, animationDelay: "0.3s" }}
              >
                <Zap size={32} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2
            style={{ ...styles.sectionTitle, textAlign: "center" }}
            className="animate-on-scroll scale-in"
            id="founder-title"
          >
            Meet the Founder
          </h2>

          <div style={styles.row}>
            <div
              style={isMobile ? styles.colMobile : styles.colLg5}
              className="animate-on-scroll slide-in-left"
              id="founder-photo"
            >
              <div
                style={styles.founderPhotoOuter}
                className={isMobile ? "" : "floating-3d"}
              >
                <div style={styles.founderPhotoRing}>
                  <img
                    src={adil}
                    alt="Adil S.B. - Founder of Dimensify3D"
                    style={styles.founderPhoto}
                  />
                </div>
                {!isMobile && (
                  <div className="glow-effect" style={styles.founderGlow}></div>
                )}
              </div>
            </div>

            <div
              style={isMobile ? styles.colMobile : styles.colLg7}
              className="animate-on-scroll slide-in-right"
              id="founder-intro"
            >
              <p style={{ ...styles.text, fontSize: "1.2rem" }}>
                Hi, I'm <strong style={{ color: "#2a65c5" }}>Adil S.B.</strong>,
                the founder of{" "}
                <strong style={{ color: "#2a65c5" }}>Dimensify3D</strong>. I
                specialize in transforming ideas into innovative engineering and
                digital solutions by combining mechanical engineering with
                modern software technologies.   My journey began with a simple curiosity: how does an idea on
                paper become something you can hold in your hands? That question
                led me through mechanical design, embedded systems, mobile
                development, and full-stack web technologies, giving me a rare
                ability to see a project from every angle.
              </p>
            </div>
          </div>

          <div style={styles.row}>
            <div
              style={isMobile ? styles.colMobile : styles.colLg6}
              className="animate-on-scroll slide-in-left"
              id="founder-expertise"
            >
              <h3 style={styles.subHeading}>Experience & Expertise</h3>
              <ul style={styles.expertiseList}>
                {expertise.map((item, i) => (
                  <li key={i} style={styles.expertiseItem}>
                    <span style={styles.expertiseIcon}>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={isMobile ? styles.colMobile : styles.colLg6}
              className="animate-on-scroll slide-in-right"
              id="founder-projects"
            >
              <h3 style={styles.subHeading}>Notable Projects</h3>
              <div style={styles.projectsGrid}>
                {notableProjects.map((proj, i) => (
                  <div key={i} style={styles.projectChip}>
                    {proj}
                  </div>
                ))}
              </div>

              <h3 style={{ ...styles.subHeading, marginTop: "35px" }}>
                My Approach
              </h3>
              <ul style={styles.approachList}>
                {approach.map((item, i) => (
                  <li key={i} style={styles.approachItem}>
                    <CheckCircle2
                      size={18}
                      color="#2a65c5"
                      style={{ flexShrink: 0 }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            style={styles.quoteBox}
            className="animate-on-scroll zoom-in"
            id="founder-quote"
          >
            <Quote size={30} style={{ opacity: 0.5, marginBottom: "10px" }} />
            <p style={styles.quoteText}>
              Every great product begins with an idea. My mission is to turn
              that idea into reality.
            </p>
          </div>
        </div>
      </section>

      {/* Meet the Team Section */}
      <section style={{ ...styles.section, ...styles.darkSection }}>
        {!isMobile && <div className="wave-top"></div>}
        <div style={styles.container}>
          <h2
            style={{
              ...styles.sectionTitle,
              color: "#fff",
              textAlign: "center",
            }}
            className="animate-on-scroll flip-in"
            id="team-title"
          >
            Meet Our Team
          </h2>
          <div style={styles.teamGrid}>
            {team.map((member, index) => (
              <div
                key={index}
                className={
                  isMobile
                    ? "feature-card"
                    : "animate-on-scroll feature-card tilt-card"
                }
                id={`team-${index}`}
                style={{
                  ...styles.teamCard,
                  animationDelay: isMobile ? "0s" : `${index * 0.15}s`,
                }}
              >
                <div
                  style={{ ...styles.teamAvatar, background: member.gradient }}
                >
                  {member.icon}
                </div>
                <h4 style={styles.teamName}>{member.name}</h4>
                <span style={styles.teamRole}>{member.role}</span>
                <p style={styles.teamDescription}>{member.description}</p>
                {!isMobile && <div className="shine-effect"></div>}
              </div>
            ))}
          </div>
        </div>
        {!isMobile && <div className="wave-bottom"></div>}
      </section>

      {/* Mission Section with Parallax Effect */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.row}>
            <div
              style={isMobile ? styles.colMobile : styles.colLg6}
              className="animate-on-scroll slide-in-left"
              id="mission"
            >
              <div style={styles.missionBox}>
                <h2 style={styles.sectionTitle} className="gradient-text">
                  Our Mission
                </h2>
                <p
                  style={{ ...styles.text, textAlign: "justify" }}
                  className={isMobile ? "" : "reveal-text"}
                >
                  At Dimensify3D, we believe that every idea deserves to take
                  shape. Our mission is simple – to make 3D printing accessible,
                  innovative, and impactful for individuals and businesses
                  across India.
                </p>
                <p
                  style={{ ...styles.text, textAlign: "justify" }}
                  className={isMobile ? "" : "reveal-text"}
                >
                  From turning your designs into reality to providing
                  ready-to-use 3D products, we are here to bridge the gap
                  between imagination and creation.
                </p>
              </div>
            </div>
            {!isMobile && (
              <div style={styles.dividerCol}>
                <svg
                  style={styles.curvyLine}
                  viewBox="0 0 100 400"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 50 0 Q 20 100 50 200 T 50 400"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    className="curvy-path"
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#2a65c5" stopOpacity="0.3" />
                      <stop
                        offset="50%"
                        stopColor="#0a50b1"
                        stopOpacity="0.8"
                      />
                      <stop
                        offset="100%"
                        stopColor="#2a65c5"
                        stopOpacity="0.3"
                      />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
            <div
              style={isMobile ? styles.colMobile : styles.colLg6}
              className="animate-on-scroll slide-in-right"
              id="mission-visual"
            >
              <div style={styles.visualBox}>
                <div
                  style={styles.floatingIconWrapper}
                  className={isMobile ? "" : "floating-3d"}
                >
                  <Box size={isMobile ? 60 : 80} strokeWidth={1.5} />
                  {!isMobile && <div className="glow-effect"></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who We Are Section with Wave Animation */}
      <section style={{ ...styles.section, ...styles.darkSection }}>
        {!isMobile && <div className="wave-top"></div>}
        <div style={styles.container}>
          <div className="animate-on-scroll zoom-in" id="who-we-are">
            <h2
              style={{
                ...styles.sectionTitle,
                color: "#fff",
                textAlign: "center",
              }}
            >
              Who We Are
            </h2>
            <p
              style={{
                ...styles.text,
                textAlign: "center",
                color: "#e0e0e0",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              Born out of a passion for design and technology, Dimensify3D was
              founded with the vision of helping people bring their concepts to
              life. Whether it's a student's project, a startup's prototype, or
              a hobbyist's creative idea, we empower everyone to turn their
              digital models into tangible objects with precision and care.
            </p>
          </div>
        </div>
        {!isMobile && <div className="wave-bottom"></div>}
      </section>

      {/* Services Section with Stagger Animation */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2
            style={{ ...styles.sectionTitle, textAlign: "center" }}
            className="animate-on-scroll scale-in"
            id="services-title"
          >
            What We Do
          </h2>
          <div style={styles.serviceGrid}>
            {services.map((service, index) => (
              <div
                key={index}
                className={isMobile ? "" : "animate-on-scroll service-card"}
                id={`service-${index}`}
                style={{
                  ...styles.serviceCard,
                  animationDelay: isMobile ? "0s" : `${index * 0.2}s`,
                }}
              >
                <div style={styles.cardGlow}></div>
                <div style={styles.serviceCardBody}>
                  <div
                    style={{ ...styles.serviceIcon, color: service.color }}
                    className={
                      isMobile ? "service-icon" : "service-icon rotate-on-hover"
                    }
                  >
                    {service.icon}
                  </div>
                  <h3 style={styles.serviceTitle}>{service.title}</h3>
                  <p style={styles.serviceText}>{service.description}</p>
                  <div style={styles.cardFooter}>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section with Tilt Effect */}
      <section style={{ ...styles.section, background: "transparent" }}>
        <div style={styles.container}>
          <h2
            style={{ ...styles.sectionTitle, textAlign: "center" }}
            className="animate-on-scroll flip-in"
            id="why-title"
          >
            Why Choose Us
          </h2>
          <div style={styles.featureGrid}>
            {features.map((feature, index) => (
              <div
                key={index}
                className={
                  isMobile
                    ? "feature-card"
                    : "animate-on-scroll feature-card tilt-card"
                }
                id={`feature-${index}`}
                style={{
                  ...styles.featureCard,
                  animationDelay: isMobile ? "0s" : `${index * 0.15}s`,
                }}
              >
                <div
                  style={{
                    ...styles.featureIconWrapper,
                    background: feature.gradient,
                  }}
                >
                  <div style={styles.featureIcon}>{feature.icon}</div>
                </div>
                <h4 style={styles.featureTitle}>{feature.title}</h4>
                <p style={styles.featureText}>{feature.description}</p>
                {!isMobile && <div className="shine-effect"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Section with Morphing Background */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div className="animate-on-scroll bounce-in" id="vision">
            <div
              style={styles.visionBox}
              className={isMobile ? "" : "morphing-bg"}
            >
              {!isMobile && (
                <>
                  <div className="blob blob-1"></div>
                  <div className="blob blob-2"></div>
                </>
              )}
              <h2
                style={{
                  ...styles.sectionTitle,
                  color: "#fff",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                Our Vision Ahead
              </h2>
              <p
                style={{
                  ...styles.text,
                  color: "#fff",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                We aim to grow into a one-stop destination for 3D printing and
                design innovation. From supporting makers and businesses today
                to offering advanced industrial-grade solutions tomorrow,
                Dimensify3D is on a journey to reshape the way India creates.
              </p>
              <div
                style={{
                  ...styles.visionHighlight,
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div className={isMobile ? "" : "pulse-ring"}>
                  <Target size={48} strokeWidth={1.5} />
                </div>
                <p style={styles.visionText}>
                  Shaping the Future of Creation in India
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          background: linear-gradient(135deg,
            #f5f5f5 0%,  
            #e9edf2 25%,  
            #dce2e8 50%,   
            #cfd6dd 75%,  
            #e9edf2 100%
          );
          margin: 0;
          padding: 0;
        }

        /* Admin Modal Animation */
        .admin-modal {
          animation: modalSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes modalSlideIn {
          from {
            transform: scale(0.8) translateY(-50px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        /* Curvy Line Animation */
        .curvy-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw-line 3s ease-out forwards;
        }

        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* Particles Animation */
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: float-particle 20s infinite ease-in-out;
        }

        @keyframes float-particle {
          0%, 100% { 
            transform: translateY(100vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { 
            transform: translateY(-100px) translateX(100px) rotate(360deg);
            opacity: 0;
          }
        }

        /* Floating Shapes */
        .floating-shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
          animation: float-shapes 20s infinite ease-in-out;
        }

        @keyframes float-shapes {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(50px, -50px) rotate(90deg); }
          50% { transform: translate(0, -100px) rotate(180deg); }
          75% { transform: translate(-50px, -50px) rotate(270deg); }
        }

        /* Glitch Effect */
        .glitch {
          position: relative;
        }

        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }

        .glitch::before {
          animation: glitch-1 2s infinite;
          color: #00fff9;
          z-index: -1;
        }

        .glitch::after {
          animation: glitch-2 2s infinite;
          color: #ff00c1;
          z-index: -2;
        }

        @keyframes glitch-1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }

        @keyframes glitch-2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(2px, -2px); }
          40% { transform: translate(2px, 2px); }
          60% { transform: translate(-2px, -2px); }
          80% { transform: translate(-2px, 2px); }
        }

        /* Pulse Icons */
        .pulse-icon {
          animation: pulse-grow 2s infinite;
        }

        @keyframes pulse-grow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* Gradient Text */
        .gradient-text {
          background: linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Floating 3D Effect */
        .floating-3d {
          animation: float-3d 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }

        @keyframes float-3d {
          0%, 100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
          25% { transform: translateY(-20px) rotateX(5deg) rotateY(5deg); }
          50% { transform: translateY(-40px) rotateX(0deg) rotateY(10deg); }
          75% { transform: translateY(-20px) rotateX(-5deg) rotateY(5deg); }
        }

        .glow-effect {
          position: absolute;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(42,101,197,0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: glow-pulse 3s infinite;
          z-index: -1;
        }

        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        /* Wave Animation */
        .wave-top, .wave-bottom {
          position: absolute;
          width: 100%;
          height: 100px;
          left: 0;
        }

        .wave-top {
          top: -1px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z' fill='%23f5f5f5'/%3E%3C/svg%3E") no-repeat center;
          background-size: cover;
        }

        .wave-bottom {
          bottom: -1px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z' fill='%23f5f5f5'/%3E%3C/svg%3E") no-repeat center;
          background-size: cover;
          transform: rotate(180deg);
        }

        /* Card Animations */
        .service-card, .feature-card {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .service-card:hover {
          transform: translateY(-15px) scale(1.02);
          box-shadow: 0 20px 50px rgba(42,101,197,0.3) !important;
        }

        .rotate-on-hover {
          transition: transform 0.6s ease;
        }

        .service-card:hover .rotate-on-hover {
          transform: rotate(360deg) scale(1.1);
        }

        /* Tilt Effect */
        .tilt-card {
          transition: all 0.3s ease;
        }

        .tilt-card:hover {
          transform: perspective(1000px) rotateX(5deg) rotateY(5deg) translateY(-10px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.2) !important;
        }

        /* Shine Effect */
        .shine-effect {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: rotate(45deg);
          transition: all 0.5s;
          opacity: 0;
        }

        .feature-card:hover .shine-effect {
          animation: shine 0.8s;
        }

        @keyframes shine {
          0% { transform: translateX(-100%) rotate(45deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%) rotate(45deg); opacity: 0; }
        }

        /* Morphing Background */
        .morphing-bg {
          position: relative;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          animation: morph 20s infinite;
        }

        .blob-1 {
          width: 300px;
          height: 300px;
          background: #00fff9;
          top: -50px;
          left: -50px;
        }

        .blob-2 {
          width: 250px;
          height: 250px;
          background: #ff00c1;
          bottom: -50px;
          right: -50px;
          animation-delay: -10s;
        }

        @keyframes morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }

        /* Pulse Ring */
        .pulse-ring {
          position: relative;
          display: inline-block;
        }

        .pulse-ring::before,
        .pulse-ring::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border: 2px solid #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulse-ring 2s infinite;
        }

        .pulse-ring::after {
          animation-delay: 1s;
        }

        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }

        /* Scroll Animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .slide-in-left {
          transform: translateX(-50px);
        }

        .slide-in-right {
          transform: translateX(50px);
        }

        .scale-in {
          transform: scale(0.8);
        }

        .flip-in {
          transform: perspective(1000px) rotateX(45deg);
        }

        .zoom-in {
          transform: scale(0.5);
        }

        .bounce-in {
          transform: scale(0.3);
        }

        ${Object.keys(isVisible)
          .map((id) =>
            isVisible[id]
              ? `#${id} { opacity: 1; transform: translateY(0) translateX(0) scale(1) perspective(1000px) rotateX(0); }`
              : "",
          )
          .join("\n")}

        /* Expand Line */
        .expand-line {
          animation: expand 1.5s ease-out forwards;
          transform-origin: center;
        }

        @keyframes expand {
          from { width: 0; }
          to { width: 80px; }
        }

        /* Fade In Up */
        .fade-in-up {
          animation: fadeInUp 1s ease-out 0.3s backwards;
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Reveal Text */
        .reveal-text {
          animation: revealText 1s ease-out forwards;
          opacity: 0;
        }

        @keyframes revealText {
          from { 
            opacity: 0;
            filter: blur(10px);
          }
          to {
            opacity: 1;
            filter: blur(0);
          }
        }

        @media (max-width: 768px) {
          .service-card, .feature-card {
            margin-bottom: 20px;
          }
          .floating-shape {
            display: none;
          }
          .dividerCol {
            display: none !important;
          }
          .colLg6 {
            flex: 0 0 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <Footer />
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#2c3e50",
    overflowX: "hidden",
    background:
      "linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)",
  },
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 20px",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    margin: "0 -15px 40px",
    alignItems: "flex-start",
  },
  colLg6: {
    flex: "0 0 45%",
    maxWidth: "45%",
    padding: "0 15px",
  },
  colLg5: {
    flex: "0 0 38%",
    maxWidth: "38%",
    padding: "0 15px",
  },
  colLg7: {
    flex: "0 0 57%",
    maxWidth: "57%",
    padding: "0 15px",
    display: "flex",
    alignItems: "center",
  },
  colMobile: {
    flex: "0 0 100%",
    maxWidth: "100%",
    padding: "0 15px",
    marginBottom: "30px",
  },
  dividerCol: {
    flex: "0 0 10%",
    maxWidth: "10%",
    padding: "0 15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  curvyLine: {
    width: "100%",
    height: "400px",
    filter: "drop-shadow(0 0 8px rgba(42, 101, 197, 0.3))",
  },
  hero: {
    background:
      "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)",
    padding: "120px 0",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  heroContent: {
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  heroTitle: {
    fontSize: "clamp(2.5rem, 5vw, 4rem)",
    fontWeight: "700",
    marginBottom: "20px",
    letterSpacing: "-1px",
  },
  heroSubtitle: {
    fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
    fontWeight: "300",
    opacity: 0.95,
    maxWidth: "700px",
    margin: "0 auto 30px",
  },
  heroDivider: {
    width: "80px",
    height: "4px",
    background: "#fff",
    margin: "30px auto",
    borderRadius: "2px",
  },
  heroIcons: {
    display: "flex",
    justifyContent: "center",
    gap: "30px",
    marginTop: "30px",
  },
  heroIcon: {
    animation: "pulse-grow 2s infinite",
  },
  floatingShape1: {
    width: "300px",
    height: "300px",
    background: "rgba(255, 255, 255, 0.1)",
    top: "10%",
    left: "5%",
  },
  floatingShape2: {
    width: "200px",
    height: "200px",
    background: "rgba(255, 255, 255, 0.1)",
    top: "60%",
    right: "10%",
    animationDelay: "5s",
  },
  floatingShape3: {
    width: "150px",
    height: "150px",
    background: "rgba(255, 255, 255, 0.1)",
    bottom: "20%",
    left: "15%",
    animationDelay: "10s",
  },
  section: {
    padding: "100px 0",
    position: "relative",
  },
  darkSection: {
    background: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
  },
  sectionTitle: {
    fontSize: "clamp(2rem, 4vw, 2.8rem)",
    fontWeight: "700",
    marginBottom: "50px",
    color: "#2c3e50",
  },
  subHeading: {
    fontSize: "1.4rem",
    fontWeight: "700",
    marginBottom: "20px",
    color: "#2a65c5",
  },
  text: {
    fontSize: "1.1rem",
    lineHeight: "1.8",
    color: "#555",
    marginBottom: "20px",
  },
  missionBox: {
    padding: "20px",
  },
  visualBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    minHeight: "300px",
  },
  floatingIconWrapper: {
    color: "#2a65c5",
    position: "relative",
  },

  /* Founder styles */
  founderPhotoOuter: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    padding: "20px",
  },
  founderPhotoRing: {
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    padding: "8px",
    background:
      "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)",
    boxShadow: "0 20px 50px rgba(42,101,197,0.35)",
    position: "relative",
    zIndex: 1,
  },
  founderPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #fff",
    display: "block",
  },
  founderGlow: {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  expertiseList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  expertiseItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    fontSize: "1rem",
    color: "#555",
    lineHeight: "1.6",
    background: "#fff",
    padding: "14px 18px",
    borderRadius: "12px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },
  expertiseIcon: {
    color: "#2a65c5",
    flexShrink: 0,
    marginTop: "2px",
  },
  projectsGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "10px",
  },
  projectChip: {
    background:
      "linear-gradient(135deg, rgba(42,101,197,0.08) 0%, rgba(10,80,177,0.08) 100%)",
    color: "#0a50b1",
    padding: "10px 16px",
    borderRadius: "999px",
    fontSize: "0.9rem",
    fontWeight: "600",
    border: "1px solid rgba(42,101,197,0.2)",
  },
  approachList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  approachItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "1rem",
    color: "#555",
  },
  quoteBox: {
    marginTop: "20px",
    textAlign: "center",
    background:
      "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)",
    color: "#fff",
    padding: "45px 40px",
    borderRadius: "20px",
    boxShadow: "0 20px 50px rgba(42,101,197,0.3)",
  },
  quoteText: {
    fontSize: "1.4rem",
    fontWeight: "600",
    fontStyle: "italic",
    maxWidth: "750px",
    margin: "0 auto",
    lineHeight: "1.6",
  },

  /* Team styles */
  teamGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "30px",
    marginTop: "50px",
  },
  teamCard: {
    background: "#fff",
    padding: "40px 30px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    textAlign: "center",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  teamAvatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    color: "#fff",
    position: "relative",
    zIndex: 1,
  },
  teamName: {
    fontSize: "1.3rem",
    fontWeight: "700",
    marginBottom: "6px",
    color: "#2c3e50",
  },
  teamRole: {
    display: "inline-block",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#2a65c5",
    marginBottom: "14px",
  },
  teamDescription: {
    fontSize: "0.95rem",
    color: "#666",
    lineHeight: "1.6",
  },

  serviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "40px",
    marginTop: "50px",
  },
  serviceCard: {
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    height: "100%",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  cardGlow: {
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "radial-gradient(circle, rgba(42,101,197,0.1) 0%, transparent 70%)",
    opacity: 0,
    transition: "opacity 0.3s",
  },
  serviceCardBody: {
    padding: "40px 30px",
    textAlign: "center",
    position: "relative",
    zIndex: 1,
  },
  serviceIcon: {
    marginBottom: "20px",
    display: "inline-block",
  },
  serviceTitle: {
    fontSize: "1.6rem",
    fontWeight: "600",
    marginBottom: "15px",
    color: "#2c3e50",
  },
  serviceText: {
    fontSize: "1rem",
    color: "#666",
    lineHeight: "1.7",
    marginBottom: "20px",
  },
  cardFooter: {
    marginTop: "20px",
  },
  learnMore: {
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.3s",
    display: "inline-block",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "30px",
    marginTop: "50px",
  },
  featureCard: {
    background: "#fff",
    padding: "40px 30px",
    borderRadius: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    height: "100%",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  featureIconWrapper: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    position: "relative",
    zIndex: 1,
  },
  featureIcon: {
    color: "#fff",
  },
  featureTitle: {
    fontSize: "1.4rem",
    fontWeight: "600",
    marginBottom: "12px",
    color: "#2c3e50",
  },
  featureText: {
    fontSize: "1rem",
    color: "#666",
    lineHeight: "1.7",
  },
  visionBox: {
    background:
      "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)",
    padding: "70px 50px",
    borderRadius: "25px",
    color: "#fff",
    textAlign: "center",
    boxShadow: "0 25px 70px rgba(42, 101, 197, 0.4)",
    position: "relative",
    overflow: "hidden",
  },
  visionHighlight: {
    marginTop: "50px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
  },
  visionText: {
    fontSize: "1.4rem",
    fontWeight: "600",
    margin: 0,
  },
  // Admin Modal Styles
  adminModalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    backdropFilter: "blur(5px)",
  },
  adminModal: {
    background: "linear-gradient(135deg, #fff 0%, #f8f9fa 100%)",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
    maxWidth: "400px",
    width: "90%",
    textAlign: "center",
  },
  adminModalContent: {
    padding: "20px",
  },
  adminModalTitle: {
    fontSize: "1.8rem",
    fontWeight: "700",
    marginBottom: "15px",
    color: "#2a65c5",
  },
  adminModalText: {
    fontSize: "1rem",
    color: "#555",
    lineHeight: "1.6",
    marginBottom: "25px",
  },
  adminModalButtons: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
  },
  adminButtonPrimary: {
    background:
      "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(42, 101, 197, 0.3)",
  },
  adminButtonSecondary: {
    background: "transparent",
    color: "#666",
    border: "2px solid #ddd",
    padding: "12px 24px",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};