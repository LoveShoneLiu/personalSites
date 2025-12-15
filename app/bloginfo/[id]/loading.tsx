import styles from './loading.module.scss';

const BlogInfoLoading = () => (
  <div className={styles.loadingContainer}>
    <div className="container">
      <div className={styles.backLinkSkeleton} />

      <article className={styles.article}>
        <header className={styles.header}>
          <div className={styles.featuredImageSkeleton} />

          <div className={styles.headerContent}>
            <div className={styles.titleSkeleton} />
            <div className={styles.titleSkeleton} style={{ width: '80%' }} />

            <div className={styles.descriptionSkeleton} />
            <div className={styles.descriptionSkeleton} style={{ width: '90%' }} />

            <div className={styles.metaSkeleton}>
              <div className={styles.dateSkeleton} />
              <div className={styles.tagsSkeleton}>
                <div className={styles.tagSkeleton} />
                <div className={styles.tagSkeleton} />
                <div className={styles.tagSkeleton} />
              </div>
            </div>
          </div>
        </header>

        <div className={styles.contentSkeleton}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className={styles.paragraphSkeleton} />
          ))}
        </div>
      </article>
    </div>
  </div>
);

export default BlogInfoLoading;
