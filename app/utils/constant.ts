// 个人信息、工作经历、教育等前端常量统一维护在这里

// 个人信息
export const personalInfo = {
  name: 'Shaofei Liu',
  title: 'Senior Frontend Engineer',
  avatar: '/shaofeiliu.jpg', // 位于 public 目录下的头像图片
  email: 'isshaofeiliu@gmail.com',
  // phone: '+64 (029) 0255 5581',
  phone: 'To Be Determined',
  wechat: 'ShoneLiu007', // 微信id
  location: 'Auckland, New Zealand',
  visaStatus: 'Partner of Work Visa (Spouse)', // 当前签证状态
  bio: [
    'I am a senior front-end engineer with 10 years of experience in large-scale web application development, with roughly 460,000 lines of code produced. I have worked at Bangzhidian Technology, Cheetah Mobile, Momo, and Meituan.',
    'During my six years at Meituan, I was responsible for front-end development of the membership system on both mobile (C-end) and PC platforms, serving pages with tens of millions of daily PV. I have strong experience in large-scale front-end development, performance optimization, and stability assurance.',
    'While at Meituan, I received a project team award and the Collaboration Star Award, filed one patent, and published four technical articles in the company’s internal engineering journal.',
  ],
  skills: [
    'JavaScript',
    'HTML & HTML5',
    'CSS & CSS3',
    'React',
    'Vue.js',
    'Next.js',
    'Node.js',
    'TypeScript',
    'Weex',
    'Jquery',
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
export const workExperience = [
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
export const education = [
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
