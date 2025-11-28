import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.scss";

// 个人信息
const personalInfo = {
  name: "Shaofei Liu",
  title: "Full Stack Developer",
  avatar: "/avatar.jpg", // 需要添加头像图片
  email: "shaofei.liu@example.com",
  phone: "+64 21 XXX XXXX",
  location: "New Zealand",
  bio: "Passionate full-stack developer with expertise in React, Next.js, and modern web technologies. Seeking opportunities to contribute to innovative projects in New Zealand.",
  skills: [
    "React", "Next.js", "TypeScript", "Node.js",
    "PostgreSQL", "MongoDB", "REST API", "GraphQL",
    "AWS", "Docker", "Git", "Agile"
  ],
  social: {
    github: "https://github.com/yourusername",
    linkedin: "https://linkedin.com/in/yourusername",
    email: "mailto:shaofei.liu@example.com"
  }
};

// 工作经历
const workExperience = [
  {
    id: 1,
    company: "Tech Company A",
    position: "Senior Full Stack Developer",
    period: "2022 - Present",
    location: "Remote",
    description: "Led development of enterprise web applications using React and Node.js",
    projects: [
      {
        name: "E-commerce Platform",
        description: "Built a scalable e-commerce platform serving 100K+ users",
        technologies: ["Next.js", "PostgreSQL", "Redis", "AWS"]
      },
      {
        name: "Admin Dashboard",
        description: "Developed comprehensive admin dashboard with real-time analytics",
        technologies: ["React", "TypeScript", "GraphQL", "D3.js"]
      }
    ]
  },
  {
    id: 2,
    company: "Tech Company B",
    position: "Full Stack Developer",
    period: "2020 - 2022",
    location: "City, Country",
    description: "Developed and maintained multiple client-facing web applications",
    projects: [
      {
        name: "CRM System",
        description: "Built customer relationship management system from scratch",
        technologies: ["React", "Node.js", "MongoDB", "Docker"]
      }
    ]
  }
];

// 教育背景
const education = [
  {
    id: 1,
    school: "University Name",
    degree: "Bachelor of Computer Science",
    period: "2016 - 2020",
    location: "City, Country",
    achievements: [
      "GPA: 3.8/4.0",
      "Dean's List (2018, 2019)",
      "Graduated with Honors"
    ]
  }
];

export default function HomePage() {
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
              <p className={styles.heroBio}>{personalInfo.bio}</p>
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
                  <span className={styles.avatarPlaceholder}>SF</span>
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
            <div className={styles.ctaButtons}>
              <a href={personalInfo.social.email} className={styles.primaryButton}>
                Contact Me
              </a>
              <a href={personalInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className={styles.secondaryButton}>
                LinkedIn Profile
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
