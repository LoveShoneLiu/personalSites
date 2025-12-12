'use client';

import { useState } from 'react';
import styles from './page.module.scss';

// 个人信息
const personalInfo = {
  name: 'Shaofei Liu',
  title: 'Senior Frontend Engineer',
  avatar: '/shaofeiliu.jpg', // 位于 public 目录下的头像图片
  email: 'isshaofeiliu@gmail.com',
  phone: '+64 (029) 0255 5581',
  wechat: 'ShoneLiu007', // 微信id
  location: 'Auckland, New Zealand',
  bio: [
    'I am a senior front-end engineer with 10 years of experience in large-scale web application development, with roughly 460,000 lines of code produced. I have worked at Bangzhidian Technology, Cheetah Mobile, Momo, and Meituan.',
    'During my six years at Meituan, I was responsible for front-end development of the membership system on both mobile (C-end) and PC platforms, serving pages with tens of millions of daily PV. I have strong experience in large-scale front-end development, performance optimization, and stability assurance.',
    'While at Meituan, I received a project team award and the Collaboration Star Award, filed one patent, and published four technical articles in the company’s internal engineering journal.',
  ],
  skills: [
    'JavaScript',
    'HTML & CSS',
    'React',
    'Vue.js',
    'Next.js',
    'Node.js',
    'TypeScript',
    'Web Performance Optimization',
    'Frontend Architecture',
    'Monitoring & Error Tracking',
  ],
  social: {
    github: 'https://github.com/yourusername', // TODO: 替换为真实 GitHub
    linkedin: 'https://linkedin.com/in/yourusername', // TODO: 替换为真实 LinkedIn
    email: 'mailto:isshaofeiliu@gmail.com',
  },
};

// 工作经历
const workExperience = [
  {
    id: 1,
    company: 'Meituan (美团)',
    position: 'Senior Frontend Engineer – Membership',
    period: '2019.09 - 2025.12',
    location: 'Beijing, China',
    description:
      'Meituan is a technology retail company. With its "Retail + Technology" strategy, Meituan practices its corporate mission of "helping everyone eat better and live better". Currently at Meituan, I am a senior frontend engineer. Over my 6 years at Meituan, I have written 280,000 lines of code and have extensive web frontend development experience.',
    projects: [
      {
        name: 'Meituan Takeout Membership Business',
        description:
          'Responsible for web frontend development of Meituan Takeout Membership user-side pages and operations management system. To meet business development needs, conducted at least 6 major redesigns and refactorings over 6 years. The user-side Meituan Takeout Membership homepage reached 15 million daily PV. The operations PC side adopted a micro-frontend architecture to achieve rapid business development and iteration.',
        technologies: ['Vue.js', 'React', 'TypeScript', 'Node.js', 'Webpack'],
      },
      {
        name: 'Stability Governance',
        description:
          'Established a comprehensive stability governance system with measurable metrics including online incidents, customer complaints, and page availability. Implemented prevention measures through strict development processes (requirement review, technical design review, code review, UI review, QA testing) and code standards (six musts and two don\'ts). Built multi-level error monitoring and alerting system covering JavaScript errors, API errors, resource errors, PV anomalies, and core path tracking. Implemented error capture mechanisms including window error listeners, Promise rejection handlers, Vue error handlers, and React ErrorBoundary components. Established on-call duty system and standardized incident response process (observe, respond, notify, stop loss, rollback). Conducted post-incident reviews using 5 Whys analysis to identify root causes and implement improvements. Achieved proactive error detection with no S9+ incidents and improved page availability from 98.33% to 99.95%.',
        technologies: ['JavaScript', 'Vue.js', 'React', 'Monitoring & Logging'],
      },
      {
        name: 'Performance Optimization',
        description:
          'Led comprehensive performance optimization initiatives for membership pages, implementing multiple pre-operation strategies including pre-rendering, pre-requests (advancing API calls before JS resource loading), resource preloading (storing framework and business resources in APP cache), and container preloading (saving ~800ms by preloading Webview containers). Optimized bundle size through tree shaking, code splitting, and image optimization (WebP for Android, PNG for iOS). Applied progressive loading techniques with skeleton screens and optimized React code with useMemo, useCallback, and React.memo. Increased the FMP (First Meaningful Paint) instant-load rate from ~30% to ~80%.',
        technologies: ['Web Performance', 'React', 'Vue.js', 'HTTP/2', 'Caching'],
      },
      {
        name: 'Diting Technical Project',
        description:
          'Meituan\'s customer complaint handling commonly faces challenges including difficulty in identifying responsible teams, lack of key information for problem troubleshooting, and insufficient accumulation of historical experience. To address these issues, I led the development of the Diting platform by leveraging the company\'s internal Raptor and Logan log platforms. The platform provides error code management website, Daxiang official account, and multi-terminal SDK capabilities, helping integrated businesses achieve at least 80% efficiency improvement in complaint resolution. During my tenure leading Diting, I integrated 37 businesses and assisted in resolving 2,231 complaints. The error code management website has accumulated 479 error code knowledge base entries.',
        technologies: ['JavaScript', 'HTML&HTML5', 'CSS&CSS5', 'Nodejs', 'Mysql'],
      },
      {
        name: 'Infinite Technology Project',
        description:
          'Developed a comprehensive animation platform to address the limitations of existing CSS and JavaScript animation solutions. Conducted extensive technical research on various animation and rendering technologies including Lottie, Three.js, VAP, Unity, and others. Built an animation platform supporting transparent video, gyroscope effects, Lottie, and other animation types, with capabilities for animation creation, hosting, editing, reuse, deployment, and open API integration. Developed multi-terminal SDKs for iOS, Android, Front-End, and Mini Programs. The platform provides a systematic solution integrating hosting, reuse, creation, generation, configuration, deployment, publishing, and end-to-end support capabilities. Currently hosts 3,498 animations, serves 124 teams, and businesses integrating animations have achieved an average CTR increase of over 10%.',
        technologies: ['JavaScript', 'HTML&HTML5', 'CSS&CSS5', 'Nodejs', 'Mysql', 'Lottie', 'VAP'],
      },
    ],
  },
  {
    id: 2,
    company: 'Momo Inc. (陌陌)',
    position: 'Frontend Engineer',
    period: '2018 - 2019',
    location: 'Beijing, China',
    description:
      'Momo is a U.S.-listed company where users can express themselves through video, text, voice, and images, discover nearby people based on location, join nearby groups, and build authentic, effective, and healthy social relationships.',
    projects: [
      {
        name: 'Momo APP Game Hall',
        description:
          'Independently responsible for the development and maintenance of Momo APP Game Hall using Weex technology. Built a high-performance mobile game platform with seamless native integration, delivering smooth user experience.',
        technologies: ['Weex', 'JavaScript', 'Vue.js', 'HTML&HTML5', 'CSS&CSS3'],
      },
    ],
  },
  {
    id: 3,
    company: 'Cheetah Mobile (猎豹移动)',
    position: 'Frontend Engineer',
    period: '2017 - 2018',
    location: 'Beijing, China',
    description:
      'Cheetah Mobile is a leading Chinese internet and mobile security software company, renowned for successfully expanding tool applications overseas. The company provides services including AI service robots, overseas advertising agency (official Meta and TikTok partner), and multi-cloud management, committed to becoming a globally leading intelligent service and industry empowerment company in the AI era.',
    projects: [
      {
        name: 'Cheetah Mobile Advertising Platform',
        description:
          'Responsible for building Cheetah Mobile\'s advertising platform, developing and maintaining core advertising infrastructure and features.',
        technologies: ['AngularJS', 'Jquery', 'JavaScript', 'HTML&HTML5', 'CSS&CSS3'],
      },
    ],
  },
  {
    id: 4,
    company: 'Beijing Percent Technology Co., Ltd.',
    position: 'Frontend Engineer',
    period: '2015 - 2017',
    location: 'Beijing, China',
    description:
      'Started my career as a web frontend developer, building enterprise data products and internal systems, and establishing solid fundamentals in JavaScript, CSS, and engineering practices.',
    projects: [
      {
        name: 'Internal Enterprise System',
        description:
          'Collaborated closely with backend and product teams to develop internal enterprise systems.',
        technologies: ['JavaScript', 'HTML&HTML5', 'CSS&CSS3', 'Jquery'],
      },
    ],
  },
];

// 教育背景
const education = [
  {
    id: 1,
    school: 'Zhengzhou University',
    degree: 'Bachelor of E-commerce',
    period: '2011 - 2015',
    location: 'Zhengzhou, China',
    achievements: [
      'Major in E-commerce with ~70% of courses related to computer science (data structures, databases, networks, etc.)',
      'Built a solid foundation in computer science and web technologies, which supported my 10-year frontend career',
    ],
  },
];

// 荣誉与个人成就
const honors = [
  {
    title: 'Patent & Innovation',
    description:
      'Filed a business-related patent, demonstrating my strong sense of ownership and continuous drive to explore and improve.',
    image: '/honors/patent-and-donation-cert.jpg',
  },
  {
    title: 'Long-term Commitment',
    description:
      'My overall performance has been recognized by the company, which granted me 3-year and 5-year service anniversary awards.',
    image: '/honors/service-anniversary-donation-toys.png',
  },
  {
    title: 'Charity & Social Responsibility',
    description:
      'Recognized as an employee charity monthly donor, supporting children in need through long-term monthly donations.',
    image: '/honors/monthly-donation-detail.png',
  },
  {
    title: 'Membership Project Team Award',
    description:
      'Recognized as part of the Meituan membership project team, delivering measurable impact to the business.',
    image: '/honors/membership-team-award.png',
  },
  {
    title: 'Collaboration Star – Quarterly Excellence',
    description:
      "Awarded the Collaboration Star in Meituan's quarterly excellence evaluation, highlighting strong cross-team collaboration.",
    image: '/honors/collaboration-star.png',
  },
];

type Honor = (typeof honors)[number];

const HomePage = () => {
  const [activeHonor, setActiveHonor] = useState<Honor | null>(null);

  return (
    <div className={styles.homePage}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>
                Hi, I&apos;m
                {' '}
                <span className={styles.highlight}>{personalInfo.name}</span>
              </h1>
              <p className={styles.heroSubtitle}>{personalInfo.title}</p>
              {Array.isArray(personalInfo.bio) ? (
                personalInfo.bio.map((text) => (
                  <p key={text.substring(0, 20)} className={styles.heroBio}>
                    {text}
                  </p>
                ))
              ) : (
                <p className={styles.heroBio}>{personalInfo.bio}</p>
              )}
              <div className={styles.heroContact}>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>📧</span>
                  <div className={styles.heroContactContent}>
                    <span className={styles.heroContactLabel}>Email: </span>
                    <a href={`mailto:${personalInfo.email}`} className={styles.heroContactLink}>
                      {personalInfo.email}
                    </a>
                  </div>
                </div>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>📱</span>
                  <div className={styles.heroContactContent}>
                    <span className={styles.heroContactLabel}>Phone: </span>
                    <span className={styles.heroContactText}>{personalInfo.phone}</span>
                  </div>
                </div>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>💬</span>
                  <div className={styles.heroContactContent}>
                    <span className={styles.heroContactLabel}>WeChat: </span>
                    <span className={styles.heroContactText}>{personalInfo.wechat}</span>
                  </div>
                </div>
                <div className={styles.heroContactItem}>
                  <span className={styles.heroContactIcon}>📍</span>
                  <div className={styles.heroContactContent}>
                    <span className={styles.heroContactLabel}>Location: </span>
                    <span className={styles.heroContactText}>{personalInfo.location}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.heroImage}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatarGlow} />
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
            {personalInfo.skills.map((skill) => (
              <div key={skill} className={styles.skillTag}>
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
                <div className={styles.timelineDot} />
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
                      {job.projects.map((project) => (
                        <div key={project.name} className={styles.project}>
                          <h5 className={styles.projectName}>{project.name}</h5>
                          <p className={styles.projectDescription}>{project.description}</p>
                          <div className={styles.projectTech}>
                            {project.technologies.map((tech) => (
                              <span key={tech} className={styles.techBadge}>
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
                    {edu.achievements.map((achievement) => (
                      <li key={achievement.substring(0, 30)}>{achievement}</li>
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
            <h2 className={styles.ctaTitle}>Let&apos;s Work Together</h2>
            <p className={styles.ctaText}>
              I&apos;m currently seeking new opportunities in New Zealand.
              Let&apos;s connect and discuss how I can contribute to your team.
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setActiveHonor(null);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions,
              jsx-a11y/click-events-have-key-events */}
          <div
            className={styles.honorModal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="honor-title"
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
              <h3 id="honor-title" className={styles.honorModalTitle}>{activeHonor.title}</h3>
              <p className={styles.honorModalDescription}>
                {activeHonor.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
