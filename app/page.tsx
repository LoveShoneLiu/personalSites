'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { personalInfo, workExperience, education } from '@/app/utils/constant';
import styles from './page.module.scss';

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

type HomeBlogPost = {
  id: number;
  title: string;
  description: string | null;
  createdAt: string | Date | null;
};

const HomePage = () => {
  const [activeHonor, setActiveHonor] = useState<Honor | null>(null);
  const [latestPosts, setLatestPosts] = useState<HomeBlogPost[]>([]);

  useEffect(() => {
    async function fetchLatestPosts() {
      try {
        const res = await fetch('/api/posts');
        if (!res.ok) return;
        const data: any[] = await res.json();
        const published = data.filter((item) => item.isPublished);
        const topThree = published.slice(0, 3).map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          createdAt: item.createdAt,
        }));
        setLatestPosts(topThree);
      } catch {
        // 静默失败，不影响首页其他内容
      }
    }

    fetchLatestPosts();
  }, []);

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
              <div className={styles.heroMeta}>
                <span className={styles.heroVisaBadge}>
                  Visa Status:
                  {' '}
                  {personalInfo.visaStatus}
                </span>
              </div>
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
            {/* 第一排：2 列 */}
            <div className={styles.honorsGridTop}>
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
            {/* 第二排：3 列 */}
            <div className={styles.honorsGridBottom}>
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
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className={`${styles.section} ${styles.blogSection}`}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Blog</h2>
          <p className={styles.blogIntro}>
            Welcome to read my blog for more details about my projects and thinking.
          </p>
          {latestPosts.length > 0 && (
            <div className={styles.blogGrid}>
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/bloginfo/${post.id}`}
                  className={styles.blogCard}
                >
                  <h3 className={styles.blogCardTitle}>{post.title}</h3>
                  {post.description && (
                    <p className={styles.blogCardDescription}>{post.description}</p>
                  )}
                  <div className={styles.blogCardMeta}>
                    {post.createdAt && (
                      <span className={styles.blogCardDate}>
                        {formatDate(post.createdAt)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className={styles.blogActions}>
            <Link href="/blog" className={styles.primaryButton}>
              Visit My Tech Blog
            </Link>
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
