"use client";

import { useState } from "react";
import styles from "./page.module.scss";

// 个人信息
const personalInfo = {
  name: "Shaofei Liu",
  title: "Senior Frontend Engineer",
  avatar: "/shaofeiliu.jpg", // 位于 public 目录下的头像图片
  email: "isshaofeiliu@gmail.com",
  phone: "+64 (029) 0255 5581",
  location: "Auckland, New Zealand",
  bio: [
    "I am a senior front-end engineer with 10 years of experience in large-scale web application development, with roughly 460,000 lines of code produced. I have worked at Bangzhidian Technology, Cheetah Mobile, Momo, and Meituan.",
    "During my six years at Meituan, I was responsible for front-end development of the membership system on both mobile (C-end) and PC platforms, serving pages with tens of millions of daily PV. I have strong experience in large-scale front-end development, performance optimization, and stability assurance.",
    "While at Meituan, I received a project team award and the Collaboration Star Award, filed one patent, and published four technical articles in the company’s internal engineering journal.",
  ],
  skills: [
    "JavaScript",
    "HTML & CSS",
    "React",
    "Vue.js",
    "Next.js",
    "Node.js",
    "TypeScript",
    "Web Performance Optimization",
    "Frontend Architecture",
    "Monitoring & Error Tracking",
  ],
  social: {
    github: "https://github.com/yourusername", // TODO: 替换为真实 GitHub
    linkedin: "https://linkedin.com/in/yourusername", // TODO: 替换为真实 LinkedIn
    email: "mailto:isshaofeiliu@gmail.com"
  }
};

// 工作经历
const workExperience = [
  {
    id: 1,
    company: "Meituan (美团)",
    position: "Senior Frontend Engineer – Membership",
    period: "2019.09 - 2025.12",
    location: "Beijing, China",
    description:
      "Responsible for Meituan membership frontend on both mobile and PC. The mobile membership pages reached tens of millions of PV in a single day and involved critical payment flows. Led stability, performance, and feature development with more than 30 cross-team collaborators.",
    projects: [
      {
        name: "Meituan Membership (Mobile & PC)",
        description:
          "Participated from 0 to 1 in the membership project, including initial design, multiple major iterations, and large-scale refactoring. Over 6+ years, wrote ~280,000 lines of production code while continuously improving code quality.",
        technologies: ["Vue.js", "React", "TypeScript", "Node.js", "Webpack"]
      },
      {
        name: "Stability & Monitoring System",
        description:
          "Designed and implemented multi-level error monitoring, including window-level, component-level, AJAX error handling, and business event tracking. Achieved proactive detection of page errors, with no S9+ incidents and page availability improved from 98.33% to 99.95%.",
        technologies: ["JavaScript", "Vue.js", "React", "Monitoring & Logging"]
      },
      {
        name: "Performance Optimization – Instant-load Project",
        description:
          "Led performance optimization for membership pages using pre-requests, skeleton screens, lazy loading, image compression, and JS optimization. Increased the FMP (First Meaningful Paint) instant-load rate from ~10% to ~80%.",
        technologies: ["Web Performance", "React", "Vue.js", "HTTP/2", "Caching"]
      }
    ]
  },
  {
    id: 2,
    company: "Momo Inc. (陌陌)",
    position: "Frontend Engineer",
    period: "2018 - 2019",
    location: "Beijing, China",
    description:
      "Worked on large-scale user-facing web applications for a U.S.-listed social networking company, focusing on high-traffic pages and growth features.",
    projects: [
      {
        name: "User Growth & Activity Pages",
        description:
          "Developed and iterated multiple marketing and activity pages, ensuring stable performance under high concurrency and complex business logic.",
        technologies: ["JavaScript", "Vue.js", "HTML5", "CSS3"]
      }
    ]
  },
  {
    id: 3,
    company: "Cheetah Mobile (猎豹移动)",
    position: "Frontend Engineer",
    period: "2017 - 2018",
    location: "Beijing, China",
    description:
      "Participated in the development of international products for a U.S.-listed internet company, gaining experience in global user-facing web applications.",
    projects: [
      {
        name: "Global Web Projects",
        description:
          "Implemented and maintained multiple global marketing and product pages, focusing on performance and compatibility across regions and devices.",
        technologies: ["JavaScript", "jQuery", "Responsive Design"]
      }
    ]
  },
  {
    id: 4,
    company: "Beijing Percent Technology Co., Ltd.",
    position: "Frontend Engineer",
    period: "2015 - 2017",
    location: "Beijing, China",
    description:
      "Started my career as a web frontend developer, building enterprise data products and internal systems, and establishing solid fundamentals in JavaScript, CSS, and engineering practices.",
    projects: [
      {
        name: "Enterprise Data Dashboards",
        description:
          "Developed data visualization dashboards and internal tools, collaborating closely with backend and product teams.",
        technologies: ["JavaScript", "HTML5", "CSS3", "Data Visualization Basics"]
      }
    ]
  }
];

// 教育背景
const education = [
  {
    id: 1,
    school: "Zhengzhou University",
    degree: "Bachelor of E-commerce",
    period: "2011 - 2015",
    location: "Zhengzhou, China",
    achievements: [
      "Major in E-commerce with ~70% of courses related to computer science (data structures, databases, networks, etc.)",
      "Built a solid foundation in computer science and web technologies, which supported my 10-year frontend career"
    ]
  }
];

// 荣誉与个人成就
const honors = [
  {
    title: "Patent & Innovation",
    description:
      "Filed a business-related patent, demonstrating my strong sense of ownership and continuous drive to explore and improve.",
    image: "/honors/patent-and-donation-cert.jpg",
  },
  {
    title: "Long-term Commitment",
    description:
      "My overall performance has been recognized by the company, which granted me 3-year and 5-year service anniversary awards.",
    image: "/honors/service-anniversary-donation-toys.png",
  },
  {
    title: "Charity & Social Responsibility",
    description:
      "Recognized as an employee charity monthly donor, supporting children in need through long-term monthly donations.",
    image: "/honors/monthly-donation-detail.png",
  },
  {
    title: "Membership Project Team Award",
    description:
      "Recognized as part of the Meituan membership project team, delivering measurable impact to the business.",
    image: "/honors/membership-team-award.png",
  },
  {
    title: "Collaboration Star – Quarterly Excellence",
    description:
      "Awarded the Collaboration Star in Meituan's quarterly excellence evaluation, highlighting strong cross-team collaboration.",
    image: "/honors/collaboration-star.png",
  },
];

type Honor = (typeof honors)[number];

export default function HomePage() {
  const [activeHonor, setActiveHonor] = useState<Honor | null>(null);

  return (
    <div className={styles.homePage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Hi, I'm <span className={styles.highlight}>{personalInfo.name}</span>
              </h1>
              <p className={styles.heroSubtitle}>{personalInfo.title}</p>
              {Array.isArray(personalInfo.bio) ? (
                personalInfo.bio.map((text, index) => (
                  <p key={index} className={styles.heroBio}>
                    {text}
                  </p>
                ))
              ) : (
                <p className={styles.heroBio}>{personalInfo.bio}</p>
              )}
              <div className={styles.heroContact}>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>📧</span>
                  <a href={`mailto:${personalInfo.email}`} className={styles.heroContactLink}>
                    {personalInfo.email}
                  </a>
                </div>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>📱</span>
                  <span className={styles.heroContactText}>{personalInfo.phone}</span>
                </div>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>📍</span>
                  <span className={styles.heroContactText}>{personalInfo.location}</span>
                </div>
              </div>
            </div>
            <div className={styles.heroImage}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatarGlow}></div>
                <div className={styles.avatar}>
                  <img
                    src={personalInfo.avatar}
                    alt={personalInfo.name}
                    className={styles.avatarImage}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className={`${styles.section} ${styles.skillsSection}`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Skills & Technologies</h2>
          <div className={styles.skillsGrid}>
            {personalInfo.skills.map((skill, index) => (
              <div key={index} className={styles.skillTag}>
                {skill}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Work Experience Section */}
      <section className={`${styles.section} ${styles.experienceSection}`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Work Experience</h2>
          <div className={styles.timeline}>
            {workExperience.map((job) => (
              <div key={job.id} className={styles.timelineItem}>
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.jobHeader}>
                    <div>
                      <h3 className={styles.jobPosition}>{job.position}</h3>
                      <p className={styles.jobCompany}>{job.company}</p>
                    </div>
                    <div className={styles.jobMeta}>
                      <span className={styles.jobPeriod}>{job.period}</span>
                      <span className={styles.jobLocation}>{job.location}</span>
                    </div>
                  </div>
                  <p className={styles.jobDescription}>{job.description}</p>
                  {job.projects && (
                    <div className={styles.projects}>
                      <h4 className={styles.projectsTitle}>Key Projects:</h4>
                      {job.projects.map((project, idx) => (
                        <div key={idx} className={styles.project}>
                          <h5 className={styles.projectName}>{project.name}</h5>
                          <p className={styles.projectDescription}>{project.description}</p>
                          <div className={styles.projectTech}>
                            {project.technologies.map((tech, techIdx) => (
                              <span key={techIdx} className={styles.techBadge}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honors Section */}
      <section className={`${styles.section} ${styles.honorsSection}`}>
        <div className="container">
          <div className={styles.honorsContent}>
            <div className={styles.honorsText}>
              <h2 className={styles.sectionTitle}>Honors & Personal Achievements</h2>
              <p className={styles.honorsIntro}>
                Beyond day-to-day development work, I have been recognized for technical excellence,
                collaboration, long-term commitment, and social responsibility.
              </p>
              <ul className={styles.honorsList}>
                <li>Project team award and Collaboration Star Award at Meituan.</li>
                <li>Filed one patent in the frontend engineering domain.</li>
                <li>3-year and 5-year service anniversary awards.</li>
                <li>Long-term charity monthly donor recognition.</li>
              </ul>
            </div>
            {/* 第一排：3 列 */}
            <div className={styles.honorsGridTop}>
              {honors.slice(0, 3).map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className={styles.honorCard}
                  onClick={() => setActiveHonor(item)}
                >
                  <div className={styles.honorImageWrapper}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className={styles.honorImage}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.honorInfo}>
                    <h3 className={styles.honorTitle}>{item.title}</h3>
                    <p className={styles.honorDescription}>{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
            {/* 第二排：2 列 */}
            <div className={styles.honorsGridBottom}>
              {honors.slice(3).map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className={styles.honorCard}
                  onClick={() => setActiveHonor(item)}
                >
                  <div className={styles.honorImageWrapper}>
                    <img
                      src={item.image}
                      alt={item.title}
                      className={styles.honorImage}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.honorInfo}>
                    <h3 className={styles.honorTitle}>{item.title}</h3>
                    <p className={styles.honorDescription}>{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className={`${styles.section} ${styles.educationSection}`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Education</h2>
          <div className={styles.educationGrid}>
            {education.map((edu) => (
              <div key={edu.id} className={styles.educationCard}>
                <div className={styles.educationIcon}>🎓</div>
                <h3 className={styles.educationDegree}>{edu.degree}</h3>
                <p className={styles.educationSchool}>{edu.school}</p>
                <div className={styles.educationMeta}>
                  <span>{edu.period}</span>
                  <span>{edu.location}</span>
                </div>
                {edu.achievements && (
                  <ul className={styles.achievements}>
                    {edu.achievements.map((achievement, idx) => (
                      <li key={idx}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Let's Work Together</h2>
            <p className={styles.ctaText}>
              I'm currently seeking new opportunities in New Zealand. 
              Let's connect and discuss how I can contribute to your team.
            </p>
            {/* CTA 按钮暂时隐藏，后续需要时可恢复
            <div className={styles.ctaButtons}>
              <a href={personalInfo.social.email} className={styles.primaryButton}>
                Contact Me
              </a>
              <a
                href={personalInfo.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryButton}
              >
                LinkedIn Profile
              </a>
            </div>
            */}
          </div>
        </div>
      </section>

      {activeHonor && (
        <div
          className={styles.honorModalBackdrop}
          onClick={() => setActiveHonor(null)}
        >
          <div
            className={styles.honorModal}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.honorModalClose}
              onClick={() => setActiveHonor(null)}
              aria-label="Close image preview"
            >
              ×
            </button>
            <div className={styles.honorModalImageWrapper}>
              <img
                src={activeHonor.image}
                alt={activeHonor.title}
                className={styles.honorModalImage}
              />
            </div>
            <div className={styles.honorModalInfo}>
              <h3 className={styles.honorModalTitle}>{activeHonor.title}</h3>
              <p className={styles.honorModalDescription}>
                {activeHonor.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
